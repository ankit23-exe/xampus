import express from 'express';
import multer from 'multer';
import { BlobServiceClient } from '@azure/storage-blob';
import File from '../models/File.js';
const router = express.Router();
import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import mammoth from 'mammoth';


function createReducedEmbeddings() {
    const baseEmbeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        model: 'gemini-embedding-001',
    });
    
    
    const originalEmbedQuery = baseEmbeddings.embedQuery.bind(baseEmbeddings);
    baseEmbeddings.embedQuery = async function(text) {
        const vector = await originalEmbedQuery(text);
        console.log(`[EMBEDDING] Original vector dimension: ${vector.length}`);
        const reduced = reduceDimensions(vector);
        console.log(`[EMBEDDING] Reduced vector dimension: ${reduced.length}`);
        return reduced;
    };
    
    
    const originalEmbedDocuments = baseEmbeddings.embedDocuments.bind(baseEmbeddings);
    baseEmbeddings.embedDocuments = async function(texts) {
        const vectors = await originalEmbedDocuments(texts);
        console.log(`[EMBEDDING] Original vectors dimension: ${vectors[0].length}`);
        const reduced = vectors.map(v => reduceDimensions(v));
        console.log(`[EMBEDDING] Reduced vectors dimension: ${reduced[0].length}`);
        return reduced;
    };
    
    return baseEmbeddings;
}


function reduceDimensions(vector) {
    const sourceLength = vector.length; // 3072
    const targetLength = 768;
    const ratio = sourceLength / targetLength; // 4
    const reduced = [];
    
    for (let i = 0; i < targetLength; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.floor((i + 1) * ratio);
        let sum = 0;
        let count = 0;
        
        for (let j = start; j < end; j++) {
            sum += vector[j];
            count++;
        }
        
        reduced.push(sum / count);
    }
    
    return reduced;
}

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and Word documents are allowed'), false);
        }
    }
});

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME;
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);

const uploadToAzureBlob = async (buffer, originalName) => {
    const blobName = `${Date.now()}-${originalName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: 'application/pdf' }
    });
    return { url: blockBlobClient.url, blobName };
};

const deleteFromAzureBlob = async (blobName) => {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
};


async function downloadPdfFromAzure(url, localPath) {
    console.log(`[DOWNLOAD] Starting download from Azure...`);
    console.log(`[DOWNLOAD] URL: ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to download PDF from Azure');
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(localPath, Buffer.from(buffer));
    console.log(`[DOWNLOAD] ✓ PDF saved locally to: ${localPath}`);
    console.log(`[DOWNLOAD] File size: ${Buffer.byteLength(Buffer.from(buffer))} bytes`);
}

async function chunkAndEmbedWord(buffer, originalName) {
    console.log(`[WORD] Starting Word document processing...`);
    console.log(`[WORD] File: ${originalName}`);
    
    try {
        console.log(`[WORD] Extracting text from document...`);
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value;
        console.log(`[WORD] ✓ Text extracted - ${text.length} characters`);
        
        const docs = [
            {
                pageContent: text,
                metadata: {
                    source: originalName,
                    type: 'word'
                }
            }
        ];
        
        console.log(`[CHUNKING] Starting text chunking...`);
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const chunkedDocs = await textSplitter.splitDocuments(docs);
        console.log(`[CHUNKING] ✓ Document split into ${chunkedDocs.length} chunks`);
        
        console.log(`[EMBEDDING] Initializing embedding model...`);
        const embeddings = createReducedEmbeddings();
        console.log(`[EMBEDDING] ✓ Embedding model initialized with dimension reduction`);
        
        console.log(`[PINECONE] Connecting to Pinecone...`);
        const pinecone = new Pinecone();
        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);
        console.log(`[PINECONE] ✓ Connected to index: ${process.env.PINECONE_INDEX_NAME}`);
        
        console.log(`[PINECONE] Storing ${chunkedDocs.length} chunks in Pinecone...`);
        await PineconeStore.fromDocuments(chunkedDocs, embeddings, {
            pineconeIndex,
            maxConcurrency: 5,
        });
        console.log(`[PINECONE] ✓ All chunks successfully stored in Pinecone!`);
        
    } catch (error) {
        console.error(`[WORD] Error processing Word document:`, error);
        throw error;
    }
}

async function chunkAndEmbedPdf(localPath) {
    console.log(`[CHUNKING] Starting PDF chunking and embedding...`);
    console.log(`[CHUNKING] Loading PDF from: ${localPath}`);
    
    const pdfLoader = new PDFLoader(localPath);
    const rawDocs = await pdfLoader.load();
    console.log(`[CHUNKING] ✓ PDF loaded - Found ${rawDocs.length} pages`);
    
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    const chunkedDocs = await textSplitter.splitDocuments(rawDocs);
    console.log(`[CHUNKING] ✓ PDF split into ${chunkedDocs.length} chunks`);
    
    console.log(`[EMBEDDING] Initializing embedding model...`);
    const embeddings = createReducedEmbeddings();
    console.log(`[EMBEDDING] ✓ Embedding model initialized with dimension reduction`);
    
    console.log(`[PINECONE] Connecting to Pinecone...`);
    const pinecone = new Pinecone();
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);
    console.log(`[PINECONE] ✓ Connected to index: ${process.env.PINECONE_INDEX_NAME}`);
    
    console.log(`[PINECONE] Storing ${chunkedDocs.length} chunks in Pinecone...`);
    await PineconeStore.fromDocuments(chunkedDocs, embeddings, {
        pineconeIndex,
        maxConcurrency: 5,
    });
    console.log(`[PINECONE] ✓ All chunks successfully stored in Pinecone!`);
}

// POST /api/files/upload - Upload a new file
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`[START] File upload process initiated`);
        console.log(`${'='.repeat(60)}`);
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { originalname, mimetype, size, buffer } = req.file;
        console.log(`[FILE] Name: ${originalname}`);
        console.log(`[FILE] MIME Type: ${mimetype}`);
        console.log(`[FILE] Size: ${size} bytes`);

        // Upload to Azure Blob Storage (PDF only)
        console.log(`[AZURE] Uploading to Azure Blob Storage...`);
        const azureResult = await uploadToAzureBlob(buffer, originalname);

        // Determine file format
        let format = 'Unknown';
        if (mimetype === 'application/pdf') {
            format = 'PDF';
        } else if (mimetype === 'application/msword') {
            format = 'DOC';
        } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            format = 'DOCX';
        }
        console.log(`[FILE] Format detected: ${format}`);

        // Save file details to MongoDB
        console.log(`[MONGO] Saving file details to MongoDB...`);
        const newFile = new File({
            filename: originalname,
            originalName: originalname,
            mimetype: mimetype,
            size: size,
            azureUrl: azureResult.url,
            azurePublicId: azureResult.blobName,
            format: format,
            status: 'processing'
        });

        const savedFile = await newFile.save();
        console.log(`[MONGO] ✓ File saved with ID: ${savedFile._id}`);

        // Process document (PDF or Word)
        if (format === 'PDF') {
            console.log(`[PROCESS] PDF detected - Starting processing...`);
            const documentsDir = path.join(process.cwd(), 'documents');
            if (!fs.existsSync(documentsDir)) {
                console.log(`[PROCESS] Creating documents directory...`);
                fs.mkdirSync(documentsDir);
            }
            const localPath = path.join(documentsDir, azureResult.blobName);
            try {
                console.log(`[PROCESS] Local path: ${localPath}`);
                await downloadPdfFromAzure(azureResult.url, localPath);
                await chunkAndEmbedPdf(localPath);
                // Update status in MongoDB to 'completed'
                await File.findByIdAndUpdate(savedFile._id, { status: 'completed' });
                console.log(`[PROCESS] ✓ File processing completed successfully`);
                console.log(`[MONGO] ✓ File status updated to 'completed'`);
            } catch (embedErr) {
                console.error(`[ERROR] Chunk/embed error:`, embedErr);
                console.error(`[ERROR] Error message: ${embedErr.message}`);
                console.error(`[ERROR] Error stack: ${embedErr.stack}`);
                await File.findByIdAndUpdate(savedFile._id, { status: 'failed' });
                console.log(`[MONGO] ✓ File status updated to 'failed'`);
            }
        } else if (format === 'DOCX' || format === 'DOC') {
            console.log(`[PROCESS] ${format} document detected - Starting processing...`);
            try {
                console.log(`[PROCESS] Processing buffer directly from memory...`);
                await chunkAndEmbedWord(buffer, originalname);
                // Update status in MongoDB to 'completed'
                await File.findByIdAndUpdate(savedFile._id, { status: 'completed' });
                console.log(`[PROCESS] ✓ File processing completed successfully`);
                console.log(`[MONGO] ✓ File status updated to 'completed'`);
            } catch (embedErr) {
                console.error(`[ERROR] Chunk/embed error:`, embedErr);
                console.error(`[ERROR] Error message: ${embedErr.message}`);
                console.error(`[ERROR] Error stack: ${embedErr.stack}`);
                await File.findByIdAndUpdate(savedFile._id, { status: 'failed' });
                console.log(`[MONGO] ✓ File status updated to 'failed'`);
            }
        }

        console.log(`[RESPONSE] Sending success response to client`);
        console.log(`${'='.repeat(60)}\n`);
        res.status(201).json({
            message: 'File uploaded successfully',
            file: {
                _id: savedFile._id,
                filename: savedFile.filename,
                format: savedFile.format,
                size: savedFile.size,
                status: savedFile.status,
                createdAt: savedFile.createdAt,
                cloudinaryUrl: savedFile.cloudinaryUrl
            }
        });

    } catch (error) {
        console.error(`[ERROR] Upload failed:`, error);
        console.error(`[ERROR] Error message: ${error.message}`);
        console.log(`${'='.repeat(60)}\n`);
        if (error.message && error.message.includes('Only PDF and Word documents')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ 
            error: 'Failed to upload file',
            details: error.message 
        });
    }
});

// GET /api/files - Get all files
router.get('/', async (req, res) => {
    try {
        const files = await File.find()
            .sort({ createdAt: -1 })
            .select('filename originalName format size status createdAt cloudinaryUrl');

        res.json({
            message: 'Files retrieved successfully',
            files: files
        });

    } catch (error) {
        console.error('Get files error:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve files',
            details: error.message 
        });
    }
});

// GET /api/files/:id - Get a specific file
router.get('/:id', async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.json({
            message: 'File retrieved successfully',
            file: file
        });

    } catch (error) {
        console.error('Get file error:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve file',
            details: error.message 
        });
    }
});

// DELETE /api/files/:id - Delete a file
router.delete('/:id', async (req, res) => {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`[DELETE] File deletion initiated for ID: ${req.params.id}`);
        console.log(`${'='.repeat(60)}`);
        
        const file = await File.findById(req.params.id);
        
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        console.log(`[DELETE] File name: ${file.filename}`);
        console.log(`[DELETE] File status: ${file.status}`);

        // Delete from Azure Blob Storage
        try {
            console.log(`[AZURE] Deleting from Azure Blob Storage...`);
            await deleteFromAzureBlob(file.azurePublicId);
            console.log(`[AZURE] ✓ Successfully deleted from Azure`);
        } catch (azureError) {
            console.error('[ERROR] Azure Blob deletion error:', azureError);
            // Continue with other deletions even if Azure fails
        }

        // Delete from Pinecone (if file was processed)
        if (file.status === 'completed' || file.status === 'processed') {
            try {
                console.log(`[PINECONE] Deleting vectors from Pinecone...`);
                const pinecone = new Pinecone();
                const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);
                
                // Delete vectors by file metadata filter
                // This will delete all vectors that have metadata matching the file name
                await pineconeIndex.deleteMany({
                    source: file.filename
                });
                console.log(`[PINECONE] ✓ Successfully deleted vectors from Pinecone`);
            } catch (pineconeError) {
                console.error('[ERROR] Pinecone deletion error:', pineconeError);
                console.log('[WARNING] Vectors may still exist in Pinecone but file metadata deleted');
                // Continue with MongoDB deletion even if Pinecone fails
            }
        } else {
            console.log(`[PINECONE] Skipping - file status is '${file.status}' (not fully processed)`);
        }

        // Delete from MongoDB
        console.log(`[MONGO] Deleting from MongoDB...`);
        await File.findByIdAndDelete(req.params.id);
        console.log(`[MONGO] ✓ Successfully deleted from MongoDB`);

        console.log(`[SUCCESS] File completely deleted from all systems`);
        console.log(`${'='.repeat(60)}\n`);

        res.json({
            message: 'File deleted successfully',
            deletedFile: {
                _id: file._id,
                filename: file.filename
            }
        });

    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ 
            error: 'Failed to delete file',
            details: error.message 
        });
    }
});

// PUT /api/files/:id/status - Update file status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ['uploaded', 'processing', 'ready', 'error'];
        
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const file = await File.findByIdAndUpdate(
            req.params.id,
            { status: status },
            { new: true }
        );

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.json({
            message: 'File status updated successfully',
            file: file
        });

    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ 
            error: 'Failed to update file status',
            details: error.message 
        });
    }
});

export default router;
