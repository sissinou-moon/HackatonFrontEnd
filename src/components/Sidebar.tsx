"use client";

import React from "react";
import { Plus, MessageSquare, History, Settings, LogOut, X } from "lucide-react";

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed md:relative top-0 left-0 h-full bg-gray-50 border-r border-gray-100 transition-all duration-300 ease-in-out z-50 flex flex-col
          ${isOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden"}
        `}
            >
                <div className="flex flex-col h-full min-w-[16rem]"> {/* min-w to prevent content squishing during transition */}

                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Logo_Alg%C3%A9rie_T%C3%A9l%C3%A9com.svg/1200px-Logo_Alg%C3%A9rie_T%C3%A9l%C3%A9com.svg.png"
                                alt="Algérie Télécom"
                                className="h-6 object-contain"
                            />
                        </div>
                        <button onClick={onClose} className="md:hidden p-1 hover:bg-gray-200 rounded-lg">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* New Chat Button */}
                    <div className="p-4">
                        <button className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-primary/50 hover:shadow-md hover:text-primary transition-all duration-200 shadow-sm group">
                            <div className="p-1 bg-blue-50 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                                <Plus className="w-5 h-5 text-primary group-hover:text-white" />
                            </div>
                            <span className="font-medium text-gray-700 group-hover:text-primary">New Chat</span>
                        </button>
                    </div>

                    {/* Chat History */}
                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                        <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">History</h3>
                        {["Project Alpha Review", "Q3 Financials", "Marketing Brand Assets", "Meeting Notes"].map((item, i) => (
                            <button
                                key={i}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors text-left"
                            >
                                <MessageSquare className="w-4 h-4 text-gray-400" />
                                <span className="truncate">{item}</span>
                            </button>
                        ))}
                    </div>

                    {/* Footer Area */}
                    <div className="p-4 border-t border-gray-100 space-y-1">
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                            <Settings className="w-4 h-4" />
                            <span>Settings</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                            <LogOut className="w-4 h-4" />
                            <span>Log out</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
