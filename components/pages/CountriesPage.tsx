'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { fetchCountries, Country } from '@/lib/api'
import { Globe, ChevronRight, MapPin } from 'lucide-react'
import Link from 'next/link'

export function CountriesPage() {
    const [countries, setCountries] = useState<Country[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Gradient colors for country cards
    const gradientColors = [
        "from-blue-600 via-blue-500 to-purple-600",
        "from-purple-600 via-pink-500 to-red-500", 
        "from-green-600 via-emerald-500 to-teal-600",
        "from-orange-600 via-red-500 to-pink-600",
        "from-indigo-600 via-purple-500 to-pink-600",
        "from-pink-600 via-rose-500 to-orange-500",
        "from-gray-700 via-gray-600 to-slate-600",
        "from-cyan-600 via-blue-500 to-indigo-600",
        "from-emerald-600 via-green-500 to-teal-600",
        "from-violet-600 via-purple-500 to-indigo-600",
        "from-amber-600 via-orange-500 to-red-600",
        "from-teal-600 via-cyan-500 to-blue-600"
    ]

    // Get gradient color for country by index
    const getGradientColor = (index: number) => {
        return gradientColors[index % gradientColors.length]
    }

    // Complete country mapping with flags and full names
    const countryData: { [key: string]: { name: string; flag: string } } = {
        'viet-nam': { name: 'Việt Nam', flag: '🇻🇳' },
        'trung-quoc': { name: 'Trung Quốc', flag: '🇨🇳' },
        'han-quoc': { name: 'Hàn Quốc', flag: '🇰🇷' },
        'nhat-ban': { name: 'Nhật Bản', flag: '🇯🇵' },
        'thai-lan': { name: 'Thái Lan', flag: '🇹🇭' },
        'au-my': { name: 'Âu Mỹ', flag: '🇺🇸' },
        'anh': { name: 'Anh', flag: '🇬🇧' },
        'phap': { name: 'Pháp', flag: '🇫🇷' },
        'duc': { name: 'Đức', flag: '🇩🇪' },
        'y': { name: 'Ý', flag: '🇮🇹' },
        'tay-ban-nha': { name: 'Tây Ban Nha', flag: '🇪🇸' },
        'nga': { name: 'Nga', flag: '🇷🇺' },
        'an-do': { name: 'Ấn Độ', flag: '🇮🇳' },
        'canada': { name: 'Canada', flag: '🇨🇦' },
        'uc': { name: 'Úc', flag: '🇦🇺' },
        'brazil': { name: 'Brazil', flag: '🇧🇷' },
        'mexico': { name: 'Mexico', flag: '🇲🇽' },
        'hong-kong': { name: 'Hồng Kông', flag: '🇭🇰' },
        'dai-loan': { name: 'Đài Loan', flag: '🇹🇼' },
        'indonesia': { name: 'Indonesia', flag: '🇮🇩' },
        'malaysia': { name: 'Malaysia', flag: '🇲🇾' },
        'philippines': { name: 'Philippines', flag: '🇵🇭' },
        'thuy-dien': { name: 'Thụy Điển', flag: '🇸🇪' },
        'na-uy': { name: 'Na Uy', flag: '🇳🇴' },
        'dan-mach': { name: 'Đan Mạch', flag: '🇩🇰' },
        'ha-lan': { name: 'Hà Lan', flag: '🇳🇱' },
        'thuy-si': { name: 'Thụy Sĩ', flag: '🇨🇭' },
        'bo-dao-nha': { name: 'Bồ Đào Nha', flag: '🇵🇹' },
        'tho-nhi-ky': { name: 'Thổ Nhĩ Kỳ', flag: '🇹🇷' },
        'a-rap-xe-ut': { name: 'Ả Rập Xê Út', flag: '🇸🇦' },
        'uae': { name: 'UAE', flag: '🇦🇪' },
        'ba-lan': { name: 'Ba Lan', flag: '🇵🇱' },
        'ukraina': { name: 'Ukraina', flag: '🇺🇦' },
        'chau-phi': { name: 'Châu Phi', flag: '🌍' },
        'israel': { name: 'Israel', flag: '🇮🇱' },
        'iran': { name: 'Iran', flag: '🇮🇷' },
        'ai-cap': { name: 'Ai Cập', flag: '🇪🇬' },
        'nam-phi': { name: 'Nam Phi', flag: '🇿🇦' },
        'argentina': { name: 'Argentina', flag: '🇦🇷' },
        'chile': { name: 'Chile', flag: '🇨🇱' },
        'colombia': { name: 'Colombia', flag: '🇨🇴' },
        'peru': { name: 'Peru', flag: '🇵🇪' },
        'venezuela': { name: 'Venezuela', flag: '🇻🇪' },
        'quoc-gia-khac': { name: 'Quốc gia khác', flag: '🌐' }
    }

    useEffect(() => {
        const loadCountries = async () => {
            try {
                setLoading(true)
                const countriesData = await fetchCountries()
                setCountries(countriesData)
            } catch (err) {
                setError('Không thể tải danh sách quốc gia')
                console.error('Error loading countries:', err)
            } finally {
                setLoading(false)
            }
        }

        loadCountries()
    }, [])

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <SectionHeader 
                    title="Phim Theo Quốc Gia" 
                    subtitle="Khám phá điện ảnh thế giới"
                    icon={Globe}
                />
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 mt-8">
                    {Array.from({ length: 24 }).map((_, i) => (
                        <Skeleton key={i} className="h-36 rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <SectionHeader 
                    title="Phim Theo Quốc Gia" 
                    subtitle="Khám phá điện ảnh thế giới"
                    icon={Globe}
                />
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <SectionHeader 
                title="Phim Theo Quốc Gia" 
                subtitle={`Khám phá điện ảnh từ ${countries.length} quốc gia trên thế giới`}
                icon={Globe}
                showViewAll={false}
            />
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 mt-8">
                {countries.map((country, index) => {
                    const countryInfo = countryData[country.slug] || { name: country.name, flag: '🌍' }
                    const gradientClass = getGradientColor(index)
                    
                    return (
                        <Link key={country._id} href={`/country/${country.slug}`}>
                            <Card className="group h-36 relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-0">
                                <CardContent className="p-0 h-full">
                                    <div className={`h-full w-full bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center text-white relative overflow-hidden`}>
                                        {/* Background pattern */}
                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors duration-300" />
                                        
                                        {/* Content */}
                                        <div className="relative z-10 text-center px-3 py-2">
                                            <div className="text-3xl sm:text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">
                                                {countryInfo.flag}
                                            </div>
                                            <h3 className="text-sm sm:text-base font-bold leading-tight line-clamp-2 group-hover:scale-105 transition-transform duration-300">
                                                {countryInfo.name}
                                            </h3>
                                        </div>

                                        {/* Hover arrow */}
                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <ChevronRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>

            {/* Statistics */}
            <div className="mt-12 text-center">
                <div className="inline-flex items-center space-x-2 bg-muted/50 rounded-full px-6 py-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">
                        Tổng cộng <span className="font-semibold text-foreground">{countries.length}</span> quốc gia và vùng lãnh thổ
                    </span>
                </div>
            </div>
        </div>
    )
} 