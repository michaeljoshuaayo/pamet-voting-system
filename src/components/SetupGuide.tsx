'use client'

import { AlertCircle, ExternalLink, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function SetupGuide() {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const envTemplate = `NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here`

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <AlertCircle className="mx-auto h-12 w-12 text-orange-500 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Setup Required</h1>
          <p className="text-gray-600 mt-2">Configure Supabase to get started</p>
        </div>

        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">Environment Variables Missing</h3>
            <p className="text-yellow-700 text-sm">
              Please set up your Supabase environment variables to use the voting system.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Quick Setup Steps:</h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <h4 className="font-medium text-gray-900">Create Supabase Project</h4>
                  <p className="text-gray-600 text-sm">Go to supabase.com and create a free project</p>
                  <a 
                    href="https://supabase.com/dashboard/projects" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 text-sm mt-1"
                  >
                    <span>Open Supabase Dashboard</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <h4 className="font-medium text-gray-900">Run Database Setup</h4>
                  <p className="text-gray-600 text-sm">In your Supabase dashboard, go to SQL Editor and run the script from database-setup.sql</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <h4 className="font-medium text-gray-900">Get API Credentials</h4>
                  <p className="text-gray-600 text-sm">Go to Settings → API and copy your Project URL and anon/public key</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Update .env.local</h4>
                  <p className="text-gray-600 text-sm mb-3">Copy this template and replace with your actual values:</p>
                  <div className="relative">
                    <pre className="bg-gray-100 p-3 rounded-md text-sm overflow-x-auto">
                      <code>{envTemplate}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(envTemplate)}
                      className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
                <div>
                  <h4 className="font-medium text-gray-900">Restart Development Server</h4>
                  <p className="text-gray-600 text-sm">After updating .env.local, restart the development server</p>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">npm run dev</code>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Need Help?</h4>
            <p className="text-blue-700 text-sm">
              Check the README.md file for detailed setup instructions and troubleshooting tips.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
