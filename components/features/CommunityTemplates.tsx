'use client';

import React, { memo, useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Star, 
  Users, 
  ArrowRight, 
  Github, 
  Layers,
  Sparkles,
  Zap,
  Filter,
  Copy,
  Layout
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from "next/image";

interface Template {
  id: string;
  name: string;
  description: string;
  tags: string[];
  author: string;
  stars: number;
  thumbnail: string;
  prompt: string;
}

function CommunityTemplates({ onFork }: { onFork: (template: Template) => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => {
        setTemplates(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch templates:', err);
        setLoading(false);
      });
  }, []);

  const filtered = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white flex items-center">
            <Sparkles className="w-6 h-6 mr-3 text-emerald-500" /> Community Blueprint Gallery
          </h2>
          <p className="text-muted-foreground">Accelerate your build with verified agent-ready architectures.</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search templates..." 
              className="pl-10 bg-white/5 border-white/10"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="border-white/10">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="featured" className="w-full">
        <TabsList className="bg-white/5 border border-white/5 mb-6">
          <TabsTrigger value="featured" className="text-xs uppercase tracking-widest font-bold">Featured</TabsTrigger>
          <TabsTrigger value="newest" className="text-xs uppercase tracking-widest font-bold">Newest</TabsTrigger>
          <TabsTrigger value="popular" className="text-xs uppercase tracking-widest font-bold">Most Starred</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* New Template Card */}
          <Card className="bg-[#050505] border-dashed border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer group flex flex-col items-center justify-center p-8 space-y-4">
            <div className="p-4 bg-emerald-500/10 rounded-full group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-white">Share a Blueprint</h3>
              <p className="text-xs text-muted-foreground mt-1">Publish your current build sequence as a template.</p>
            </div>
            <Button variant="secondary" size="sm" className="mt-4">
              Publish Project
            </Button>
          </Card>

          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <Card key={i} className="bg-[#050505] border-white/5 h-[380px] animate-pulse" />
            ))
          ) : (
            filtered.map((template) => (
              <Card key={template.id} className="bg-[#050505] border-white/5 hover:border-white/20 transition-all overflow-hidden group">
                <div className="h-40 overflow-hidden relative">
                  <Image 
                    src={template.thumbnail} 
                    alt={template.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex items-center space-x-2">
                    {template.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="secondary" className="bg-black/50 backdrop-blur-md text-[10px] uppercase">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-white group-hover:text-emerald-400 transition-colors">
                      {template.name}
                    </CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Star className="w-3 h-3 text-yellow-500 mr-1 fill-yellow-500" />
                      {template.stars}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2 text-sm">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Users className="w-3 h-3 mr-2" />
                    By <span className="text-white ml-1 font-medium">{template.author}</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-grow border-white/10 hover:bg-white/5"
                    onClick={() => onFork(template)}
                  >
                    <Copy className="w-4 h-4 mr-2" /> Fork
                  </Button>
                  <Button variant="secondary" className="flex-grow">
                    <ArrowRight className="w-4 h-4 mr-2" /> Preview
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </Tabs>

      {/* Social Proof Section */}
      <div className="p-8 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl">
            <Layers className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-white">Join the Creator Network</h4>
            <p className="text-sm text-muted-foreground">Your build sequences could help thousands of other architects.</p>
          </div>
        </div>
        <div className="flex -space-x-3 overflow-hidden">
          {Array(5).fill(0).map((_, i) => (
            <Image 
              key={i} 
              className="inline-block h-10 w-10 rounded-full ring-2 ring-[#050505] bg-gray-800"
              src={`https://i.pravatar.cc/100?u=${i}`}
              alt="User avatar"
            />
          ))}
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-500 text-white text-xs font-bold ring-2 ring-[#050505]">
            +42
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(CommunityTemplates);
