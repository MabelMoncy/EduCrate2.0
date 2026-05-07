import Resource from '../models/Resource.js';
import supabase from '../config/supabase.js';

// @desc    Get all resources
// @route   GET /api/resources
// @access  Private
const getResources = async (req, res, next) => {
  try {
    const { limit, semester, isPinned, subject } = req.query;
    
    let query = {};
    if (semester) query.semester = semester;
    if (subject) query.subject = subject;
    if (isPinned === 'true') query.isPinned = true;

    let resourcesQuery = Resource.find(query).sort({ createdAt: -1 });

    if (limit) {
      resourcesQuery = resourcesQuery.limit(parseInt(limit, 10));
    }

    const resources = await resourcesQuery;
    res.json(resources);
  } catch (error) {
    next(error);
  }
};

// @desc    Upload a new resource
// @route   POST /api/resources
// @access  Private
const uploadResource = async (req, res, next) => {
  try {
    const { title, description, semester, subject } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400);
      throw new Error('Please upload a PDF file');
    }

    if (!supabase) {
      res.status(500);
      throw new Error('Supabase integration not configured');
    }

    // Upload to Supabase Storage
    const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
    const { data, error } = await supabase.storage
      .from('resources') // Assumes a bucket named 'resources' exists
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) {
      console.error('Supabase upload error:', JSON.stringify(error));
      res.status(500);
      throw new Error(`Failed to upload file to storage: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('resources')
      .getPublicUrl(fileName);

    const resource = await Resource.create({
      title,
      description,
      semester,
      subject,
      fileUrl: publicUrl,
      fileType: 'pdf',
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      uploadedBy: 'anonymous',
    });

    res.status(201).json(resource);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a resource
// @route   DELETE /api/resources/:id
// @access  Private
const deleteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      res.status(404);
      throw new Error('Resource not found');
    }

    // Extract the file name from the Supabase public URL
    // URL format: .../storage/v1/object/public/resources/<fileName>
    const urlParts = resource.fileUrl.split('/resources/');
    const fileName = urlParts.length > 1 ? urlParts[1] : null;

    if (fileName && supabase) {
      const { error: storageError } = await supabase.storage
        .from('resources')
        .remove([fileName]);

      if (storageError) {
        console.error('Supabase delete error:', JSON.stringify(storageError));
        // Don't block deletion even if storage fails — still remove from DB
      }
    }

    await Resource.findByIdAndDelete(req.params.id);

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export { getResources, uploadResource, deleteResource };
