// src/utils/transformUtils.js
import { generateSignedUrl } from './generateSignedUrl'; // Ensure correct import path

// Function to transform image URLs for a given field in a given array of documents
export const transformDocumentImages = async (documents: any[], imageUrlField: string | number): Promise<any> => {
  return await Promise.all(documents.map(async (doc) => {
    const docObject = doc.toObject();

    if (docObject[imageUrlField]) {
      docObject[imageUrlField] = await generateSignedUrl(docObject[imageUrlField]);
    }

    return docObject;
  }));
};