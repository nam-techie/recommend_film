'use client'

import React from 'react'
import { Heart, Github, Twitter, Mail, Instagram, Music, MessageCircle, Linkedin, Phone } from 'lucide-react'
import { SiZalo } from 'react-icons/si'

const Footer = () => {
    return (
        <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-12 sm:mt-16">
            <div className="container mx-auto px-4 py-8 sm:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
                    {/* Left Column: About & Features */}
                    <div className="space-y-6 sm:space-y-8">
                        {/* About */}
                        <div className="space-y-3 sm:space-y-4">
                            <h3 className="text-lg sm:text-xl font-bold shiny-text">About CineMind</h3>
                            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                                Khám phá bộ phim hoàn hảo dựa trên tâm trạng hiện tại của bạn. 
                                Cinema meets Mind - nơi cảm xúc dẫn lối giải trí của bạn.
                            </p>
                        </div>

                        {/* Features */}
                        <div className="space-y-3 sm:space-y-4">
                            <h3 className="text-lg sm:text-xl font-bold shiny-text">Tính năng</h3>
                            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-muted-foreground">
                                <li className="flex items-center space-x-2">
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full"></span>
                                    <span>Gợi ý phim theo tâm trạng</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full"></span>
                                    <span>Lọc theo thể loại</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full"></span>
                                    <span>Tùy chọn sắp xếp nâng cao</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full"></span>
                                    <span>Lọc theo năm phát hành</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Right Column: Connect */}
                    <div className="space-y-4 sm:space-y-6">
                        <h3 className="text-lg sm:text-xl font-bold shiny-text">Kết nối</h3>
                        
                        {/* Professional Links */}
                        <div className="space-y-3 sm:space-y-4">
                            <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Chuyên nghiệp</h4>
                            <div className="flex space-x-4 sm:space-x-6">
                                <a href="https://github.com/nam-techie" className="group flex flex-col items-center space-y-1 sm:space-y-2 text-muted-foreground hover:text-primary transition-all duration-300" title="GitHub">
                                    <div className="p-2 sm:p-3 rounded-full bg-accent/50 group-hover:bg-primary/20 transition-colors">
                                        <Github className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </div>
                                    <span className="text-xs">GitHub</span>
                                </a>
                                <a href="https://www.linkedin.com/in/nam-ph%C6%B0%C6%A1ng-4a3503309?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" className="group flex flex-col items-center space-y-1 sm:space-y-2 text-muted-foreground hover:text-primary transition-all duration-300" title="LinkedIn">
                                    <div className="p-2 sm:p-3 rounded-full bg-accent/50 group-hover:bg-primary/20 transition-colors">
                                        <Linkedin className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </div>
                                    <span className="text-xs">LinkedIn</span>
                                </a>
                                <a href="mailto:nam.dpwork04@gmail.com" className="group flex flex-col items-center space-y-1 sm:space-y-2 text-muted-foreground hover:text-primary transition-all duration-300" title="Email">
                                    <div className="p-2 sm:p-3 rounded-full bg-accent/50 group-hover:bg-primary/20 transition-colors">
                                        <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </div>
                                    <span className="text-xs">Email</span>
                                </a>
                            </div>
                        </div>
                        
                        {/* Social Media */}
                        <div className="space-y-3 sm:space-y-4">
                            <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Mạng xã hội</h4>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <a 
                                    href="https://www.instagram.com/pwanm.ie?igsh=MXVzdTltMjlhN3dxeA==" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="shiny-button flex items-center space-x-2 text-muted-foreground hover:text-primary transition-all duration-300 p-2 sm:p-3 rounded-lg hover:bg-accent text-xs sm:text-sm"
                                >
                                    <Instagram className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="font-medium">Instagram</span>
                                </a>
                                <a 
                                    href="https://www.facebook.com/share/1E1jwCnKug/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="shiny-button flex items-center space-x-2 text-muted-foreground hover:text-primary transition-all duration-300 p-2 sm:p-3 rounded-lg hover:bg-accent text-xs sm:text-sm"
                                >
                                    <svg className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                    <span className="font-medium">Facebook</span>
                                </a>
                                <a 
                                    href="https://www.threads.com/@pwanm.ie" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="shiny-button flex items-center space-x-2 text-muted-foreground hover:text-primary transition-all duration-300 p-2 sm:p-3 rounded-lg hover:bg-accent text-xs sm:text-sm"
                                >
                                    <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="font-medium">Threads</span>
                                </a>
                                <a 
                                    href="https://open.spotify.com/user/317shpyjqyc7fn3nxgonfaaa7hqe" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="shiny-button flex items-center space-x-2 text-muted-foreground hover:text-primary transition-all duration-300 p-2 sm:p-3 rounded-lg hover:bg-accent text-xs sm:text-sm"
                                >
                                    <Music className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="font-medium">Spotify</span>
                                </a>
                                <a 
                                    href="https://zalo.me/0834090509"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shiny-button flex items-center space-x-2 text-muted-foreground hover:text-primary transition-all duration-300 p-2 sm:p-3 rounded-lg hover:bg-accent col-span-2 justify-center text-xs sm:text-sm"
                                >
                                    <span className="font-medium">Zalo</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t text-center">
                    <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1">
                        Made with <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 fill-current" /> for movie lovers
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Powered by PhimAPI
                    </p>
                </div>
            </div>
        </footer>
    )
}

export default Footer