'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProject } from '@/lib/storage';
import { VideoProject } from '@/lib/types';

export default function ReviewPage() {
  const params = useParams();
  const [project, setProject] = useState<VideoProject | null>(null);

  useEffect(() => {
    if (!params.id) return;
    const loaded = getProject(params.id as string);
    setProject(loaded);
  }, [params.id]);

  if (!project) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-8 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-4">{project.title}</h1>
          <p className="text-gray-600 mb-8">Review transition opportunities</p>

          <div className="p-8 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600">
              ✅ Video processed successfully!
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Chapters detected: {project.chapters?.length || 0}
            </p>
            <p className="text-sm text-gray-400 mt-4">
              (Transition detection coming in Phase 3)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}