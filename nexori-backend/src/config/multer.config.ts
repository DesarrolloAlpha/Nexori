import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req: Request, file: Express.Multer.File, cb) {
    // Directorio temporal para uploads
    const uploadDir = process.env.UPLOAD_TEMP_DIR || './temp_uploads';
    const fs = require('fs');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req: Request, file: Express.Multer.File, cb) {
    // Generar nombre único
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const originalName = file.originalname.replace(/\s+/g, '_'); // Reemplazar espacios
    const fileName = `${uniqueSuffix}_${originalName}`;
    cb(null, fileName);
  }
});

// Filtro para tipos de archivo permitidos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Extensiones permitidas
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'];
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;
  
  // Verificar extensión y mimetype
  if (allowedExtensions.includes(extname) && allowedMimeTypes.includes(mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido. Solo se permiten: ${allowedExtensions.join(', ')}`));
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 5 // Máximo 5 archivos por request
  }
});

// Configuración específica para minutas
export const minuteUpload = upload.single('file');

// Configuración para múltiples archivos (si se necesita en el futuro)
export const minuteMultipleUpload = upload.array('files', 5);

export default upload;