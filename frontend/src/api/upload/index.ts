import { beApi } from "../callApi";

export interface UploadResponse {
    message: string;
    file: {
        file_name: string;
        file_url: string;
        file_size: number;
        mime_type: string;
    };
}

export const uploadFile = async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    return beApi.post("/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
};
