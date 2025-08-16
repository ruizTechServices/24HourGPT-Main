import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle } from 'lucide-react';

export default function SuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-center px-4">
      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="p-8 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
          
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
            Welcome to Pro!
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Your subscription is now active. You have successfully unlocked all the amazing features.
          </p>
          
          <Button asChild>
            <Link href="/">Start Exploring</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
