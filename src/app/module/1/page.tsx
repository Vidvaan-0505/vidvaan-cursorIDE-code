'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserQuota {
  english_analysis_quota: number;
  career_survey_quota: number;
  premium_modules_quota: number;
}

interface AnalysisHistory {
  request_id: string;
  input_text: string;
  gcs_file_path: string | null;
  request_processed: string;
  assessed_level: string;
  created_at: string;
  processed_at: string | null;
  expires_at: string;
}

export default function Module1Page() {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [userQuota, setUserQuota] = useState<UserQuota | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { currentUser } = useAuth();
  const router = useRouter();

  // Load user quota on component mount
  useEffect(() => {
    if (currentUser) {
      loadUserQuota();
    }
  }, [currentUser]);

  const loadUserQuota = async () => {
    try {
      const token = await currentUser?.getIdToken();
      const response = await fetch('/api/user/quotas', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const quota = await response.json();
        setUserQuota(quota);
      }
    } catch (error) {
      console.error('Error loading quota:', error);
    } finally {
      setIsLoadingQuota(false);
    }
  };

  const loadAnalysisHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const token = await currentUser?.getIdToken();
      const response = await fetch('/api/user/analysis-history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysisHistory(data.analyses);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDownloadPDF = async (requestId: string) => {
    try {
      const token = await currentUser?.getIdToken();
      const response = await fetch(`/api/download-pdf/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // For now, just show the URL. In production, this would be a signed URL
        window.open(data.downloadUrl, '_blank');
      } else {
        setError('Failed to get download link');
      }
    } catch (error) {
      setError('Error downloading PDF');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      setError('Please enter some text to evaluate');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

          try {
        const token = await currentUser?.getIdToken();
        const response = await fetch('/api/evaluate-english-levels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: text,
            userId: currentUser?.uid,
            userEmail: currentUser?.email,
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          }),
        });

      const data = await response.json();

                     if (response.ok) {
          setMessage(`Your text has been successfully submitted! Request ID: ${data.requestId}. Processing will be done in the background.`);
          setText('');
          // Refresh quota after successful submission
          loadUserQuota();
        } else {
          if (data.error === 'Quota exceeded') {
            setError(`Quota exceeded. You have ${data.remainingQuota} analyses remaining. Please purchase more credits.`);
          } else {
            setError(data.error || 'Failed to submit text. Please try again.');
          }
        }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-500">
                ← Back to Dashboard
              </Link>
              <Link href="/" className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors duration-200">
                Vidvaan
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {currentUser?.email}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Module Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Quota Display */}
          {!isLoadingQuota && userQuota && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Your Quota</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-700">English Analysis:</span>
                  <span className={`ml-2 ${userQuota.english_analysis_quota > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {userQuota.english_analysis_quota} remaining
                  </span>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Career Survey:</span>
                  <span className="ml-2 text-gray-600">{userQuota.career_survey_quota} remaining</span>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Premium Modules:</span>
                  <span className="ml-2 text-gray-600">{userQuota.premium_modules_quota} remaining</span>
                </div>
              </div>
            </div>
          )}

          {/* History Button */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">English Level Assessment</h2>
              <p className="text-gray-600 mb-6">
                Please write a paragraph about yourself, your interests, or any topic you&apos;d like to discuss. 
                This will help us evaluate your English proficiency level and provide personalized recommendations.
              </p>
            </div>
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) {
                  loadAnalysisHistory();
                }
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              {showHistory ? 'Hide History' : 'View History'}
            </button>
          </div>

          {/* Analysis History */}
          {showHistory && (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Analysis History</h3>
              {isLoadingHistory ? (
                <div className="text-center py-4">Loading history...</div>
              ) : analysisHistory.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No analysis history found.</div>
              ) : (
                <div className="space-y-4">
                  {analysisHistory.map((analysis) => (
                    <div key={analysis.request_id} className="p-4 bg-white rounded border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium">Request ID:</span>
                          <span className="ml-2 text-sm text-gray-600">{analysis.request_id}</span>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 text-xs rounded ${
                            analysis.request_processed === 'yes' ? 'bg-green-100 text-green-800' :
                            analysis.request_processed === 'no' ? 'bg-yellow-100 text-yellow-800' :
                            analysis.request_processed === 'quota_exceeded' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {analysis.request_processed}
                          </span>
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="font-medium">Text:</span>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {analysis.input_text.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Created: {new Date(analysis.created_at).toLocaleDateString()}</span>
                        {analysis.request_processed === 'yes' && analysis.gcs_file_path && (
                          <button
                            onClick={() => handleDownloadPDF(analysis.request_id)}
                            className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                          >
                            Download PDF
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                Your Text (Minimum 50 words recommended)
              </label>
              <textarea
                id="text"
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                placeholder="Write your paragraph here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Word count: {text.split(/\s+/).filter(word => word.length > 0).length}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
                {message}
              </div>
            )}

            <div className="flex justify-between items-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit for Evaluation'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 