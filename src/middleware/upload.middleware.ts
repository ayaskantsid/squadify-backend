import multer from "multer";
import { Request, Response, NextFunction } from "express";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Multer instance: memory storage, 10 MB limit */
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Please upload an image.`));
    }
  },
});

/**
 * Middleware that handles a single "receipt" file upload.
 * Returns 400 if no file is attached or 413 if the file is too large.
 */
export const uploadReceiptMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  multerUpload.single("receipt")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ success: false, message: "File too large. Maximum size is 10 MB." });
        return;
      }
      res.status(400).json({ success: false, message: err.message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: "No receipt image provided. Upload a file with field name 'receipt'." });
      return;
    }

    next();
  });
};
