'use client'

import React from 'react'
import { Heart, Github, Mail, Instagram, Music, MessageCircle, Linkedin } from 'lucide-react'
import { SiZalo } from 'react-icons/si'

const Footer = () => {
    return (
        <footer className="relative w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-12 sm:mt-16 overflow-hidden">
            {/* Ambient background glow line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
            
            <div className="container mx-auto px-4 py-12 sm:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
                    {/* Column 1: About */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500 drop-shadow-sm">CineMind</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed pr-4">
                                Khám phá bộ phim hoàn hảo dựa trên tâm trạng hiện tại của bạn. 
                                Nơi cảm xúc dẫn lối và giao thoa với trải nghiệm điện ảnh đích thực.
                            </p>
                        </div>
                    </div>

                    {/* Column 2: Tính năng */}
                    <div className="lg:col-span-3 space-y-6">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">Khám phá</h3>
                        <ul className="space-y-4 text-sm text-muted-foreground">
                            <li className="flex items-center space-x-3 group cursor-pointer">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-all duration-300 group-hover:scale-150"></div>
                                <span className="group-hover:text-foreground transition-colors duration-300">Gợi ý phim theo tâm trạng</span>
                            </li>
                            <li className="flex items-center space-x-3 group cursor-pointer">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-all duration-300 group-hover:scale-150"></div>
                                <span className="group-hover:text-foreground transition-colors duration-300">Lọc theo thể loại</span>
                            </li>
                            <li className="flex items-center space-x-3 group cursor-pointer">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-all duration-300 group-hover:scale-150"></div>
                                <span className="group-hover:text-foreground transition-colors duration-300">Tùy chọn sắp xếp nâng cao</span>
                            </li>
                            <li className="flex items-center space-x-3 group cursor-pointer">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-all duration-300 group-hover:scale-150"></div>
                                <span className="group-hover:text-foreground transition-colors duration-300">Lọc theo năm phát hành</span>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Chuyên nghiệp */}
                    <div className="lg:col-span-2 space-y-6">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">Kết nối</h3>
                        <ul className="space-y-4 text-sm text-muted-foreground">
                            <li>
                                <a href="https://github.com/nam-techie" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 hover:text-foreground transition-all duration-300 group">
                                    <div className="p-1.5 rounded-lg bg-accent group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                        <Github className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium">GitHub</span>
                                </a>
                            </li>
                            <li>
                                <a href="https://www.linkedin.com/in/nam-ph%C6%B0%C6%A1ng-4a3503309" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 hover:text-foreground transition-all duration-300 group">
                                    <div className="p-1.5 rounded-lg bg-accent group-hover:bg-[#0A66C2]/20 group-hover:text-[#0A66C2] transition-colors">
                                        <Linkedin className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium">LinkedIn</span>
                                </a>
                            </li>
                            <li>
                                <a href="mailto:nam.dpwork04@gmail.com" className="flex items-center space-x-3 hover:text-foreground transition-all duration-300 group">
                                    <div className="p-1.5 rounded-lg bg-accent group-hover:bg-red-500/20 group-hover:text-red-500 transition-colors">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium">Email</span>
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Column 4: Mạng xã hội */}
                    <div className="lg:col-span-3 space-y-6">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">Mạng xã hội</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <a href="https://www.instagram.com/pwanm.ie?igsh=MXVzdTltMjlhN3dxeA==" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-3 rounded-xl bg-accent/40 hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:text-white transition-all duration-300 gap-2 border border-border/50 hover:border-transparent group">
                                <Instagram className="h-5 w-5 text-muted-foreground group-hover:text-white transition-colors" />
                                <span className="text-xs font-medium text-muted-foreground group-hover:text-white transition-colors">Instagram</span>
                            </a>
                            <a href="https://www.facebook.com/share/1E1jwCnKug/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-3 rounded-xl bg-accent/40 hover:bg-[#1877F2] hover:text-white transition-all duration-300 gap-2 border border-border/50 hover:border-transparent group">
                                <svg className="h-5 w-5 text-muted-foreground group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                                <span className="text-xs font-medium text-muted-foreground group-hover:text-white transition-colors">Facebook</span>
                            </a>
                            <a href="https://www.threads.com/@pwanm.ie" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-3 rounded-xl bg-accent/40 hover:bg-foreground hover:text-background transition-all duration-300 gap-2 border border-border/50 hover:border-transparent group">
                                <MessageCircle className="h-5 w-5 text-muted-foreground group-hover:text-background transition-colors" />
                                <span className="text-xs font-medium text-muted-foreground group-hover:text-background transition-colors">Threads</span>
                            </a>
                            <a href="https://open.spotify.com/user/317shpyjqyc7fn3nxgonfaaa7hqe" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-3 rounded-xl bg-accent/40 hover:bg-[#1DB954] hover:text-white transition-all duration-300 gap-2 border border-border/50 hover:border-transparent group">
                                <Music className="h-5 w-5 text-muted-foreground group-hover:text-white transition-colors" />
                                <span className="text-xs font-medium text-muted-foreground group-hover:text-white transition-colors">Spotify</span>
                            </a>
                        </div>
                        <a href="https://zalo.me/0834090509" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full p-3 rounded-xl bg-accent/40 hover:bg-[#0068FF] text-muted-foreground hover:text-white transition-all duration-300 gap-2 border border-border/50 hover:border-transparent group">
                            <SiZalo className="h-5 w-5 text-muted-foreground group-hover:text-white transition-colors" />
                            <span className="text-sm font-medium">Kết nối Zalo cá nhân</span>
                        </a>
                    </div>
                </div>

                {/* Footer Bottom */}
                <div className="mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} CineMind. All rights reserved.
                    </p>
                    <div className="flex flex-col items-center justify-center gap-2 md:items-end">
                        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                            Made with <Heart className="h-4 w-4 text-red-500 fill-current animate-pulse" /> for movie lovers
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                            Powered by PhimAPI
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer