'use client'

import React from 'react'
import { Film, Heart, Mail, Github, Linkedin, Instagram, MessageCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"

const Footer = () => {
    return (
        <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-16">
            <div className="container mx-auto px-4 py-12">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    {/* Brand Section */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Film className="h-8 w-8 text-primary" />
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                CineMind
                            </h2>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-primary">Cinema + Mind</span> - Discover your perfect movie based on your current mood. 
                            Let your emotions guide you to the ideal cinematic experience.
                        </p>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <span>Made with</span>
                            <Heart className="h-4 w-4 text-red-500 fill-current" />
                            <span>by Nam Phuong</span>
                        </div>
                    </div>

                    {/* About Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">About CineMind</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>🎭 Choose movies based on your mood</p>
                            <p>🎬 Discover films across multiple genres</p>
                            <p>⭐ Get personalized recommendations</p>
                            <p>📱 Responsive design for all devices</p>
                            <p>🌙 Dark/Light theme support</p>
                        </div>
                    </div>

                    {/* Contact Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Connect With Me</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Have questions or suggestions? Feel free to reach out!
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                            >
                                <a href="mailto:nam.dpwork04@gmail.com" target="_blank" rel="noopener noreferrer">
                                    <Mail className="h-4 w-4 mr-1" />
                                    Gmail
                                </a>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                            >
                                <a href="https://www.linkedin.com/in/nam-phương-4a3503309" target="_blank" rel="noopener noreferrer">
                                    <Linkedin className="h-4 w-4 mr-1" />
                                    LinkedIn
                                </a>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="hover:bg-gray-800 hover:text-white hover:border-gray-800 transition-colors"
                            >
                                <a href="https://github.com/nam-techie" target="_blank" rel="noopener noreferrer">
                                    <Github className="h-4 w-4 mr-1" />
                                    GitHub
                                </a>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-colors"
                            >
                                <a href="https://discordapp.com/users/995694235946844261" target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="h-4 w-4 mr-1" />
                                    Discord
                                </a>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-colors"
                            >
                                <a href="https://www.instagram.com/pwanm.ie" target="_blank" rel="noopener noreferrer">
                                    <Instagram className="h-4 w-4 mr-1" />
                                    Instagram
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t pt-6">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <div className="text-sm text-muted-foreground">
                            © 2025 CineMind. All rights reserved.
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>Powered by TMDB API</span>
                            <span>•</span>
                            <span>Built with Next.js</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer