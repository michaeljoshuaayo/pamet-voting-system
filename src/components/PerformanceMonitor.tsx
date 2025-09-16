'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Activity, Users, Database, Zap } from 'lucide-react'

interface PerformanceMonitorProps {
  performanceMetrics: {
    loadTime: number
    concurrentUsers: number
    cacheHitRate: number
    lastUpdate: number
  }
}

export default function PerformanceMonitor({ performanceMetrics }: PerformanceMonitorProps) {
  const [systemHealth, setSystemHealth] = useState({
    dbStatus: 'good',
    responseTime: 0,
    activeConnections: 0,
    memoryUsage: 0
  })

  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const start = Date.now()
        const { error } = await supabase
          .from('admin_performance_stats')
          .select('*')
          .limit(1)
        
        const responseTime = Date.now() - start
        
        setSystemHealth({
          dbStatus: error ? 'error' : responseTime < 200 ? 'excellent' : responseTime < 500 ? 'good' : 'slow',
          responseTime,
          activeConnections: performanceMetrics.concurrentUsers,
          memoryUsage: Math.round(Math.random() * 100) // Placeholder
        })
      } catch {
        setSystemHealth(prev => ({ ...prev, dbStatus: 'error' }))
      }
    }

    checkSystemHealth()
    const interval = setInterval(checkSystemHealth, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [performanceMetrics])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-500'
      case 'good': return 'text-blue-500'
      case 'slow': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return '🚀'
      case 'good': return '✅'
      case 'slow': return '⚠️'
      case 'error': return '❌'
      default: return '⚪'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          System Performance
        </h3>
        <span className="text-xs text-gray-500">
          Last updated: {new Date(performanceMetrics.lastUpdate).toLocaleTimeString()}
        </span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Database className={`h-6 w-6 ${getStatusColor(systemHealth.dbStatus)}`} />
          </div>
          <p className="text-sm font-medium text-gray-600">Database</p>
          <p className={`text-lg font-bold ${getStatusColor(systemHealth.dbStatus)}`}>
            {getStatusIcon(systemHealth.dbStatus)} {systemHealth.dbStatus}
          </p>
          <p className="text-xs text-gray-500">{systemHealth.responseTime}ms</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Users className="h-6 w-6 text-blue-500" />
          </div>
          <p className="text-sm font-medium text-gray-600">Active Users</p>
          <p className="text-lg font-bold text-blue-600">
            {performanceMetrics.concurrentUsers}
          </p>
          <p className="text-xs text-gray-500">concurrent</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Zap className="h-6 w-6 text-yellow-500" />
          </div>
          <p className="text-sm font-medium text-gray-600">Load Time</p>
          <p className={`text-lg font-bold ${performanceMetrics.loadTime < 200 ? 'text-green-600' : performanceMetrics.loadTime < 500 ? 'text-blue-600' : 'text-yellow-600'}`}>
            {performanceMetrics.loadTime}ms
          </p>
          <p className="text-xs text-gray-500">last refresh</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="h-6 w-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              📱
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Cache Hits</p>
          <p className="text-lg font-bold text-purple-600">
            {performanceMetrics.cacheHitRate}
          </p>
          <p className="text-xs text-gray-500">saves DB load</p>
        </div>
      </div>
      
      {performanceMetrics.concurrentUsers > 100 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ High concurrent usage detected ({performanceMetrics.concurrentUsers} users). 
            Performance optimizations are active.
          </p>
        </div>
      )}
      
      {systemHealth.dbStatus === 'slow' && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800">
            🐌 Database response time is slower than usual ({systemHealth.responseTime}ms). 
            Consider clearing cache or checking server load.
          </p>
        </div>
      )}
      
      {systemHealth.dbStatus === 'error' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            ❌ Database connection issues detected. Fallback data may be in use.
          </p>
        </div>
      )}
    </div>
  )
}