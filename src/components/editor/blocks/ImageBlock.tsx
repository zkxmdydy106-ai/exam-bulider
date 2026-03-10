import React, { useRef } from 'react';
import classes from './ImageBlock.module.css';
import { UploadCloud, X } from 'lucide-react';

interface ImageBlockProps {
    imageUrl?: string;
    onChange: (imageUrl?: string) => void;
}

const ImageBlock: React.FC<ImageBlockProps> = ({ imageUrl, onChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                onChange(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                onChange(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    if (imageUrl) {
        return (
            <div className={classes.imagePreviewContainer}>
                <img src={imageUrl} alt="Uploaded" className={classes.previewImage} />
                <button
                    className={classes.removeImageBtn}
                    onClick={() => onChange(undefined)}
                    title="이미지 삭제"
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div
            className={classes.uploadContainer}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFileChange}
            />
            <div className={classes.uploadContent}>
                <div className={classes.iconCircle}>
                    <UploadCloud size={24} className={classes.uploadIcon} />
                </div>
                <p className={classes.uploadTitle}>클릭하거나 이미지를 드래그 앤 드롭하세요</p>
                <p className={classes.uploadSub}>PNG, JPG, GIF 최대 10MB</p>
            </div>
        </div>
    );
};

export default ImageBlock;
