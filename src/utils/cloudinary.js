// src/utils/cloudinary.js
// Helper for unsigned Cloudinary upload

export async function uploadToCloudinary(base64Image, uploadPreset, cloudName) {
  // Remove MIME prefix if present
  const base64Data = base64Image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const formData = new FormData();
  formData.append("file", `data:image/jpeg;base64,${base64Data}`);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Cloudinary upload failed");
  }
  return await response.json(); // contains secure_url
}
