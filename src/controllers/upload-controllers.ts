import type { Request, Response, NextFunction } from 'express';
import HttpError from '../models/http-error';
import { db } from '../db';
import fs from 'fs/promises';
import NodeCache from "node-cache";

const userCache = new NodeCache({ stdTTL: 300 });
import { getHashedCluster } from '../util/upload-functions';


const uploadControllers = {
    getHealth: ((req: Request, res: Response, next: NextFunction) => {
        res.status(200).send("online");
    }),
    uploadFile: (async  (req: Request, res: Response, next: NextFunction) => {
        
      const apiKey = req.header("X-API-Key") as string;
      if (!apiKey) {
        throw new HttpError("Missing API Key", 401);
      }

   
    
      let existingUser = userCache.get<{ id: string }>(apiKey);
      if (!existingUser) {
        existingUser = await db.user.findFirst({
          where: {
            apiKeys: {
              some: {
                key: apiKey,
              },
            },
          },
          select:{
            id:true
          },
          take: 1,
        }) ?? undefined
    
        if (!existingUser) {
          throw new HttpError("No user found", 404);
        }
        userCache.set(apiKey, existingUser);
      }

      if (!req.file) {
        return next(new HttpError("No file uploaded", 400));
      }
 
        const cluster = getHashedCluster(apiKey, existingUser.id) 

        // Generate a public URL for the file
        const fileUrl = `/storage/${cluster}/${req.file.filename}`;
        try {
        const createdFile = await db.file.create({
                data: {
                  originalName: req.file.originalname,
                  fileName: req.file.filename,
                  size: req.file.size,
                  appKey: apiKey,
                  mimeType: req.file.mimetype,
                  url: `/storage/${cluster}/${req.file.filename}`,
                  createdById: existingUser.id,
                }
            })
            res.status(200).json({
              message: 'File uploaded successfully',
              files: [{
                      id: createdFile.id,
                      filename: req.file.filename,
                      originalName: req.file.originalname,
                      size: req.file.size,
                      mimetype: req.file.mimetype,
                      url: fileUrl
                  }]
          })
          } catch (err) {
            console.log("FILES NOT UPLOADED!::", err)
            console.error("Bulk upload error:", err)
            next(new HttpError("Failed to save files to database: " + err, 500))
          }
       
    }),
    bulkUpload: (async (req: Request, res: Response, next: NextFunction) => {

        const apiKey = req.header("X-API-Key") as string;
        if (!apiKey) {
          throw new HttpError("Missing API Key", 401);
        }

    
      
        let existingUser = userCache.get<{
          id: string;
          name: string | null;
          email: string | null;
          emailVerified: Date | null;
          image: string | null;
        } | null>(apiKey);

        if (!existingUser) {
          existingUser = await db.user.findFirst({
            where: {
              apiKeys: {
                some: {
                  key: apiKey,
                },
              },
            },
            take: 1,
          });
      
          if (!existingUser) {
            throw new HttpError("No user found", 404);
          }
          userCache.set(apiKey, existingUser);
        }

   console.log("EXISTING_USER: ", existingUser)

        const cluster = getHashedCluster(apiKey, existingUser.id);
        
        if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
          throw new HttpError("No files uploaded", 400);
        }
        const files = (req.files as Express.Multer.File[]).map((file) => ({
          originalName: file.originalname,
          fileName: file.filename,
          size: file.size,
          appKey: apiKey,
          mimeType: file.mimetype,
          url: `/storage/${cluster}/${file.filename}`,
          createdById: existingUser.id,
        }));
      
        try {
          // Use transaction for atomicity
          await db.$transaction(async (prisma) => {
            await prisma.file.createMany({
              data: files,
            });
            console.log("FILES UPLOADED!");
          });
          res.status(200).json({
            message: "Files uploaded successfully",
            files: files.map(({ fileName, originalName, size, mimeType, url }) => ({
            filename: fileName,
            originalName,
            size,
            mimetype: mimeType,
            url,
              })),
          })

        } catch (err) {
          console.log("FILES NOT UPLOADED!::", err)
          await Promise.all(
            (req.files as Express.Multer.File[]).map(async (file) => {
              try {
                await fs.unlink(file.path);
              } catch (deleteErr) {
                console.error(`Failed to delete ${file.path}:`, deleteErr);
              }
            })
          )
      
          console.error("Bulk upload error:", err)
          next(new HttpError("Failed to save files to database", 500))
        }
      })
  };

  
  export default uploadControllers;