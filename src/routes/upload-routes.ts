import express from 'express'

import uploadControllers from '../controllers/upload-controllers'
import {uploadLimit, upload, strictUploadLimit} from "../util/upload-functions"
import validateKey from '../middleware/validate-key';


const router = express.Router();

router.get('/', uploadControllers.getHealth);

router.use(validateKey)

router.post('/single',
  uploadLimit,
  upload.single('file'),
  uploadControllers.uploadFile
);

// Bulk upload endpoint with stricter rate limiting
router.post('/bulk',
  strictUploadLimit,
  upload.array('files', 5), 
  uploadControllers.bulkUpload
);

export default router;