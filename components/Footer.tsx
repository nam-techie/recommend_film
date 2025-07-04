'use client'

import React from 'react'
import { Heart, Github, Twitter, Mail, Instagram, Music, MessageCircle, Linkedin, Phone } from 'lucide-react'

const Footer = () => {
    return (
        <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-16">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Column: About & Features */}
                    <div className="space-y-8">
                        {/* About */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold shiny-text">About CineMind</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Discover your perfect movie based on your current mood. 
                                Cinema meets Mind - where emotions guide your entertainment.
                            </p>
                        </div>

                        {/* Features */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold shiny-text">Features</h3>
                            <ul className="space-y-3 text-muted-foreground">
                                <li className="flex items-center space-x-2">
                                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                                    <span>Mood-based recommendations</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                                    <span>Genre filtering</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                                    <span>Advanced sorting options</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                                    <span>Year-based filtering</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Right Column: Connect */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold shiny-text">Connect</h3>
                        
                        {/* Professional Links */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Professional</h4>
                            <div className="flex space-x-6">
                                <a href="https://github.com/nam-techie" className="group flex flex-col items-center space-y-2 text-muted-foreground hover:text-primary transition-all duration-300" title="GitHub">
                                    <div className="p-3 rounded-full bg-accent/50 group-hover:bg-primary/20 transition-colors">
                                        <Github className="h-5 w-5" />
                                    </div>
                                    <span className="text-xs">GitHub</span>
                                </a>
                                <a href="https://www.linkedin.com/in/nam-ph%C6%B0%C6%A1ng-4a3503309?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" className="group flex flex-col items-center space-y-2 text-muted-foreground hover:text-primary transition-all duration-300" title="LinkedIn">
                                    <div className="p-3 rounded-full bg-accent/50 group-hover:bg-primary/20 transition-colors">
                                        <Linkedin className="h-5 w-5" />
                                    </div>
                                    <span className="text-xs">LinkedIn</span>
                                </a>
                                <a href="mailto:nam.dpwork04@gmail.com" className="group flex flex-col items-center space-y-2 text-muted-foreground hover:text-primary transition-all duration-300" title="Email">
                                    <div className="p-3 rounded-full bg-accent/50 group-hover:bg-primary/20 transition-colors">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <span className="text-xs">Email</span>
                                </a>
                            </div>
                        </div>
                        
                        {/* Social Media */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Social</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <a 
                                    href="https://www.instagram.com/pwanm.ie?igsh=MXVzdTltMjlhN3dxeA==" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="shiny-button flex items-center space-x-2 text-muted-foreground hover:text-primary transition-all duration-300 p-3 rounded-lg hover:bg-accent"
                                >
                                    <Instagram className="h-4 w-4" />
                                    <span className="text-sm font-medium">Instagram</span>
                                </a>
                                <a 
                                    href="https://www.facebook.com/share/1E1jwCnKug/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="shiny-button flex items-center space-x-2 text-muted-foreground hover:text-primary transition-all duration-300 p-3 rounded-lg hover:bg-accent"
                                >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                    <span className="text-sm font-medium">Facebook</span>
                                </a>
                                <a 
                                    href="https://www.threads.com/@pwanm.ie" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="shiny-button flex items-center space-x-2 text-muted-foreground hover:text-primary transition-all duration-300 p-3 rounded-lg hover:bg-accent"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="text-sm font-medium">Threads</span>
                                </a>
                                <a 
                                    href="https://open.spotify.com/user/317shpyjqyc7fn3nxgonfaaa7hqe" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="shiny-button flex items-center space-x-2 text-muted-foreground hover:text-primary transition-all duration-300 p-3 rounded-lg hover:bg-accent"
                                >
                                    <Music className="h-4 w-4" />
                                    <span className="text-sm font-medium">Spotify</span>
                                </a>
                                <a 
                                    href="tel:0834090509" 
                                    className="shiny-button flex items-center space-x-2 text-muted-foreground hover:text-primary transition-all duration-300 p-3 rounded-lg hover:bg-accent col-span-2 justify-center"
                                >
                                    <Phone className="h-4 w-4" />
                                    <span className="text-sm font-medium">Zalo: 0834090509</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t text-center">
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        Made with <Heart className="h-4 w-4 text-red-500 fill-current" /> for movie lovers
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Powered by The Movie Database (TMDB) API
                    </p>
                </div>
            </div>
        </footer>
    )
}

export default Footer