'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Grid3X3, Construction, ArrowLeft, Clock, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function GenresUpgradePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <SectionHeader 
        title="Xem Chung" 
        subtitle="Tính năng đang được nâng cấp"
        // icon không truyền từ server, render trực tiếp bên trong SectionHeader client
        icon={Grid3X3}
        showViewAll={false}
      />
      
      <div className="mt-12 flex justify-center">
        <Card className="max-w-2xl w-full border-0 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm">
          <CardContent className="p-8 sm:p-12 text-center space-y-8">
            {/* Icon Animation */}
            <div className="relative">
              <div className="flex justify-center">
                <div className="relative">
                  <Construction className="h-20 w-20 text-yellow-500 animate-bounce" />
                  <div className="absolute -top-2 -right-2">
                    <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-purple-600 to-yellow-500 bg-clip-text text-transparent">
                Đang Nâng Cấp
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Chúng tôi đang nâng cấp tính năng <span className="font-semibold text-foreground">Xem Chung</span> để mang đến cho bạn trải nghiệm tuyệt vời hơn với nhiều tính năng mới thú vị.
              </p>
            </div>

            {/* Features Preview */}
            <div className="bg-background/50 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Những gì sắp có
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Gợi ý phim thông minh</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Lọc theo tâm trạng</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Khám phá theo thể loại</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Nhiều tính năng khác</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-background/30 rounded-lg p-4">
              <Clock className="h-4 w-4" />
              <span>Dự kiến hoàn thành trong <span className="font-semibold text-primary">vài ngày tới</span></span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Về Trang Chủ
                </Button>
              </Link>
              <Link href="/ai-recommender" className="flex-1">
                <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/5">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Thử AI Recommender
                </Button>
              </Link>
            </div>

            {/* Footer Note */}
            <p className="text-xs text-muted-foreground/80 pt-4 border-t border-border/50">
              Cảm ơn bạn đã kiên nhẫn! Chúng tôi sẽ thông báo ngay khi tính năng sẵn sàng. 🚀
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 