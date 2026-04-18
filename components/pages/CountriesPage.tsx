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
                    
                    return (
                        <Link key={country._id} href={`/country/${country.slug}`}>
                            <Card className="group h-32 relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-primary/20 hover:shadow-lg border-border/40 bg-card/40 backdrop-blur-md">
                                <CardContent className="p-0 h-full">
                                    <div className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden p-4">
                                        {/* Subtle background glow on hover */}
                                        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300 pointer-events-none" />
                                        
                                        {/* Content */}
                                        <div className="relative z-10 flex flex-col items-center gap-3">
                                            <div className="text-4xl shadow-sm drop-shadow-md group-hover:-translate-y-1 transition-transform duration-300">
                                                {countryInfo.flag}
                                            </div>
                                            <h3 className="text-sm font-semibold tracking-wide text-foreground/80 group-hover:text-primary transition-colors duration-300 text-center">
                                                {countryInfo.name}
                                            </h3>
                                        </div>

                                        {/* Decorative gradient blur */}
                                        <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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