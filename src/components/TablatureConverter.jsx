import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, FileText, AlertCircle } from "lucide-react"
import frondoLogo from '@/assets/frondo.svg'

const TablatureConverter = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processedImages, setProcessedImages] = useState(null);
  const [error, setError] = useState(null);

  const processFile = async (file) => {
    setProcessing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/process-manuscript/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Processing failed');
      }

      const data = await response.json();
      setProcessedImages({
        binary: data.processed_image,
        visualization: data.visualization,
        staffLines: data.staff_lines,
        characters: data.characters
      });
    } catch (err) {
      setError('Failed to process the manuscript. Please try again.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      processFile(droppedFile);
    }
  };

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle><img src={frondoLogo} alt="Frondo" /></CardTitle>
        <CardDescription>
          Upload a scanned manuscript to extract the tablature
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* File Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            ${processing ? 'opacity-50' : ''}
          `}
        >
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-4"
          >
            <Upload className="w-12 h-12 text-gray-400" />
            <div className="text-lg">
              Drop your manuscript here or click to upload
            </div>
            <div className="text-sm text-gray-500">
              Supports PDF and image files
            </div>
          </label>
        </div>

        {/* Processing Status */}
        {processing && (
          <Alert className="mt-4">
            <FileText className="h-4 w-4" />
            <AlertTitle>Processing</AlertTitle>
            <AlertDescription>
              Processing your manuscript...
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Result Display */}
        {processedImages && !processing && (
          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Detected Features</h3>
              <div className="border rounded-lg p-4 bg-gray-50">
                <img 
                  src={processedImages.visualization} 
                  alt="Detected features"
                  className="max-w-full h-auto"
                />
                <div className="mt-2 text-sm text-gray-600">
                  <p>Green lines: Detected staff lines</p>
                  <p>Blue boxes: Potential characters</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Processed Binary Image</h3>
              <div className="border rounded-lg p-4 bg-gray-50">
                <img 
                  src={processedImages.binary} 
                  alt="Processed binary"
                  className="max-w-full h-auto"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Detection Summary</h3>
              <div className="border rounded-lg p-4 bg-gray-50">
                <p>Found {processedImages.staffLines.length} staff systems</p>
                <p>Detected {processedImages.characters.length} potential characters</p>
              </div>
            </div>
          </div>
        )}

        {/* Usage Tips */}
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tips for best results</AlertTitle>
          <AlertDescription>
            <ul className="list-disc ml-4 mt-2 space-y-1">
              <li>Use high-resolution scans</li>
              <li>Ensure the manuscript is clearly visible</li>
              <li>Avoid shadows and glare in the scan</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default TablatureConverter;