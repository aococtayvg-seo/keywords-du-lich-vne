import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { fetchKeywordData, KeywordData } from '../services/dataService';
import { Search, TrendingUp, BarChart2, MapPin, DollarSign, ArrowUpRight, ArrowDownRight, Activity, Sparkles, X, Loader2, BookOpen } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTHS = [
  { value: 'Jan', label: 'Tháng 1' },
  { value: 'Feb', label: 'Tháng 2' },
  { value: 'Mar', label: 'Tháng 3' },
  { value: 'Apr', label: 'Tháng 4' },
  { value: 'May', label: 'Tháng 5' },
  { value: 'Jun', label: 'Tháng 6' },
  { value: 'Jul', label: 'Tháng 7' },
  { value: 'Aug', label: 'Tháng 8' },
  { value: 'Sep', label: 'Tháng 9' },
  { value: 'Oct', label: 'Tháng 10' },
  { value: 'Nov', label: 'Tháng 11' },
  { value: 'Dec', label: 'Tháng 12' },
];

export default function Dashboard() {
  const [data, setData] = useState<KeywordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeyword, setSelectedKeyword] = useState<KeywordData | null>(null);
  const [selectedForecastMonth, setSelectedForecastMonth] = useState<string>('May');
  const [forecastCount, setForecastCount] = useState<number>(20);
  const [sortMonth, setSortMonth] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalKeyword, setModalKeyword] = useState<KeywordData | null>(null);
  
  const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
  const [seoKeyword, setSeoKeyword] = useState<string>('');
  const [seoContent, setSeoContent] = useState<string>('');
  const [isSeoLoading, setIsSeoLoading] = useState(false);

  const fetchSeoSuggestion = async (keyword: string) => {
    setSeoKeyword(keyword);
    setIsSeoModalOpen(true);
    setIsSeoLoading(true);
    setSeoContent('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Bạn là một chuyên gia SEO và Content Marketing chuyên về du lịch. 
        Hãy phân tích từ khóa du lịch sau: "${keyword}".
        
        Yêu cầu:
        1. Phân tích Ý định tìm kiếm (Search Intent) của người dùng khi gõ từ khóa này trên Google Search (Họ đang tìm kiếm thông tin gì? Họ ở giai đoạn nào trong hành trình du lịch?).
        2. Đề xuất một Dàn ý nội dung chi tiết cho bài viết dạng "Cẩm nang kinh nghiệm du lịch ${keyword} tự túc từ A-Z". Dàn ý cần bao gồm các phần chính (H1, H2, H3) và tóm tắt nội dung cần có trong mỗi phần để đáp ứng tốt nhất ý định tìm kiếm của người dùng.
        
        Hãy trình bày bằng tiếng Việt, sử dụng định dạng Markdown rõ ràng, chuyên nghiệp.`,
      });
      setSeoContent(response.text || 'Không có phản hồi từ AI.');
    } catch (error) {
      console.error("Error fetching SEO suggestion:", error);
      setSeoContent("Đã có lỗi xảy ra khi lấy gợi ý SEO. Vui lòng thử lại sau.");
    } finally {
      setIsSeoLoading(false);
    }
  };

  useEffect(() => {
    fetchKeywordData().then((res) => {
      setData(res);
      if (res.length > 0) {
        setSelectedKeyword(res[0]);
      }
      setLoading(false);
    }).catch(err => {
      console.error("Failed to fetch data", err);
      setLoading(false);
    });
  }, []);

  const filteredData = useMemo(() => {
    let result = [...data];
    
    if (searchQuery) {
      result = result.filter(item => 
        item.keyword.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (sortMonth) {
      result.sort((a, b) => {
        const aMonthData = a.monthlyData.filter(d => d.month.startsWith(sortMonth));
        const bMonthData = b.monthlyData.filter(d => d.month.startsWith(sortMonth));
        
        const aAvg = aMonthData.length > 0 
          ? aMonthData.reduce((sum, d) => sum + d.volume, 0) / aMonthData.length 
          : 0;
        const bAvg = bMonthData.length > 0 
          ? bMonthData.reduce((sum, d) => sum + d.volume, 0) / bMonthData.length 
          : 0;
          
        return bAvg - aAvg;
      });
    }

    return result;
  }, [data, searchQuery, sortMonth]);

  const topTrending = useMemo(() => {
    if (!data.length) return [];
    
    const monthIndex = MONTHS.findIndex(m => m.value === selectedForecastMonth);
    const prev3Indices = [(monthIndex - 2 + 12) % 12, (monthIndex - 1 + 12) % 12, monthIndex];
    const next3Indices = [(monthIndex + 1) % 12, (monthIndex + 2) % 12, (monthIndex + 3) % 12];
    
    const prev3Values = prev3Indices.map(idx => MONTHS[idx].value);
    const next3Values = next3Indices.map(idx => MONTHS[idx].value);

    const trendingData = data.map(item => {
      const getAvg = (monthValues: string[]) => {
        const filtered = item.monthlyData.filter(d => monthValues.some(mv => d.month.startsWith(mv)));
        return filtered.length > 0 ? filtered.reduce((sum, d) => sum + d.volume, 0) / filtered.length : 0;
      };

      const prevAvg = getAvg(prev3Values);
      const nextAvg = getAvg(next3Values);
      const growth = prevAvg > 0 ? ((nextAvg - prevAvg) / prevAvg) * 100 : 0;
      
      return {
        ...item,
        forecastGrowth: growth,
        forecastVolume: nextAvg
      };
    });

    return trendingData
      .sort((a, b) => b.forecastGrowth - a.forecastGrowth)
      .slice(0, forecastCount);
  }, [data, selectedForecastMonth, forecastCount]);

  const currentGrowthInfo = useMemo(() => {
    const monthIndex = MONTHS.findIndex(m => m.value === selectedForecastMonth);
    const prev3 = [MONTHS[(monthIndex - 2 + 12) % 12].label, MONTHS[(monthIndex - 1 + 12) % 12].label, MONTHS[monthIndex].label].join(', ');
    const next3 = [MONTHS[(monthIndex + 1) % 12].label, MONTHS[(monthIndex + 2) % 12].label, MONTHS[(monthIndex + 3) % 12].label].join(', ');
    return { prev3, next3 };
  }, [selectedForecastMonth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-500 font-medium">Đang tải dữ liệu từ Google Sheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Keywords | Du lịch | VnE</h1>
          </div>
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-zinc-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-zinc-300 rounded-xl leading-5 bg-zinc-50 placeholder-zinc-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                placeholder="Tìm kiếm địa điểm (Gõ Enter để tìm)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearchQuery(searchInput);
                  }
                }}
              />
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Trending */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Trending Highlights */}
            <section className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <h2 className="font-semibold text-zinc-900">Dự báo tăng trưởng</h2>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Chọn thời gian so sánh:</p>
                  <div className="flex items-center gap-2">
                    <select 
                      className="flex-1 text-sm border border-zinc-300 rounded-lg px-2 py-1.5 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={selectedForecastMonth}
                      onChange={(e) => setSelectedForecastMonth(e.target.value)}
                    >
                      {MONTHS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <select 
                      className="w-24 text-sm border border-zinc-300 rounded-lg px-2 py-1.5 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={forecastCount}
                      onChange={(e) => setForecastCount(Number(e.target.value))}
                    >
                      <option value={5}>Top 5</option>
                      <option value={10}>Top 10</option>
                      <option value={20}>Top 20</option>
                    </select>
                  </div>
                  <div className="mt-1 p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                    <p className="text-[10px] text-indigo-700 leading-tight">
                      So sánh trung bình <strong>{currentGrowthInfo.next3}</strong> với <strong>{currentGrowthInfo.prev3}</strong>
                    </p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-zinc-100 overflow-y-auto max-h-[400px]">
                {topTrending.map((item, idx) => (
                  <div
                    key={item.keyword}
                    onClick={() => setSelectedKeyword(item as KeywordData)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedKeyword(item as KeywordData);
                      }
                    }}
                    className={cn(
                      "w-full text-left px-5 py-3 hover:bg-zinc-50 transition-colors flex items-center justify-between group cursor-pointer",
                      selectedKeyword?.keyword === item.keyword && "bg-indigo-50/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400 font-mono text-sm w-4">{idx + 1}</span>
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900 capitalize">{item.keyword}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Vol TB:</span>
                          <span className="text-xs font-bold text-indigo-600">{item.avgSearchVolume.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-md",
                        item.forecastGrowth >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                      )}>
                        {item.forecastGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        <span className="text-xs font-bold">{Math.abs(item.forecastGrowth).toFixed(1)}%</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchSeoSuggestion(item.keyword);
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded transition-colors"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        Gợi ý SEO
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Details */}
          <div className="lg:col-span-2">
            {selectedKeyword ? (
              <motion.div 
                key={selectedKeyword.keyword}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6"
              >
                {/* Header Info */}
                <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 p-8">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                      <h2 className="text-4xl font-bold text-zinc-900 capitalize tracking-tight mb-2">
                        {selectedKeyword.keyword}
                      </h2>
                      <p className="text-zinc-500 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Phân tích xu hướng tìm kiếm 24 tháng
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-bold text-indigo-600 mb-1">Volume TB</p>
                        <p className="text-2xl font-bold text-zinc-900">
                          {selectedKeyword.avgSearchVolume.toLocaleString()}
                        </p>
                      </div>
                      <div className="h-12 w-px bg-zinc-200"></div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600 mb-1">Tăng trưởng dự kiến</p>
                        <div className={cn(
                          "flex items-center gap-1 text-2xl font-bold justify-end",
                          (topTrending.find(t => t.keyword === selectedKeyword.keyword)?.forecastGrowth ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {(topTrending.find(t => t.keyword === selectedKeyword.keyword)?.forecastGrowth ?? 0) >= 0 ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                          {Math.abs(topTrending.find(t => t.keyword === selectedKeyword.keyword)?.forecastGrowth ?? 0).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Chart */}
                  <div className="h-[400px] w-full mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedKeyword.monthlyData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                        <XAxis 
                          dataKey="month" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#71717a', fontSize: 12 }}
                          dy={10}
                          minTickGap={30}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#71717a', fontSize: 12 }}
                          tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                          dx={-10}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                          formatter={(value: number) => [value.toLocaleString(), 'Search Volume']}
                          labelStyle={{ color: '#71717a', marginBottom: '4px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="volume" 
                          stroke="#6366f1" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorVolume)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex items-center justify-center bg-white rounded-3xl shadow-sm border border-zinc-200 p-12 text-center min-h-[500px]">
                <div>
                  <MapPin className="w-16 h-16 text-zinc-200 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-zinc-900 mb-2">Chưa chọn địa điểm</h3>
                  <p className="text-zinc-500">Vui lòng chọn một từ khóa từ danh sách bên trái để xem chi tiết.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Explanation */}
        <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-200">
          <h3 className="text-sm font-bold text-zinc-900 mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            Giải thích ý nghĩa dữ liệu
          </h3>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Data volume search được thu thập bởi Keywordtool.IO, thu thập từ Google Search ngôn ngữ tiếng Việt trong 24 tháng gần nhất kể từ tháng 1/2026. 
            <span className="font-bold text-indigo-600 mx-1">Vol TB</span> là volume search trung bình tháng trong quãng thời gian này. Để đưa ra kết luận về kế hoạch sản xuất nội dung cần kết hợp cả Vol TB lẫn Xu hướng tăng trưởng.
            Mức tăng trưởng từ khoá được tính bằng trung bình tháng của 3 tháng tiếp theo so với trung bình tháng của 3 tháng gần nhất.

          </p>
        </div>

        {/* Bottom Section: Keyword List */}
        <section className="bg-white rounded-2xl shadow-sm border border-zinc-200 flex flex-col">
          <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-600" />
              <h2 className="font-semibold text-zinc-900">Tất cả từ khóa</h2>
              <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-1 rounded-full">
                {filteredData.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">Sắp xếp theo:</span>
              <select 
                className="text-sm border border-zinc-300 rounded-lg px-2 py-1.5 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={sortMonth || ''}
                onChange={(e) => setSortMonth(e.target.value || null)}
              >
                <option value="">Mặc định</option>
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>Vol TB {m.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="p-4">
            {filteredData.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-500">
                <Search className="w-8 h-8 mb-2 opacity-20" />
                <p>Không tìm thấy kết quả</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredData.map((item) => (
                  <div
                    key={item.keyword}
                    className={cn(
                      "w-full px-4 py-4 rounded-xl transition-all flex flex-col gap-4 border group",
                      selectedKeyword?.keyword === item.keyword 
                        ? "bg-indigo-50 border-indigo-200" 
                        : "bg-white hover:bg-zinc-50 border-zinc-200"
                    )}
                  >
                    {/* Dòng 1: Tên từ khoá show full */}
                    <button
                      onClick={() => {
                        setModalKeyword(item);
                        setIsModalOpen(true);
                      }}
                      className="text-left cursor-pointer"
                    >
                      <h3 className="font-bold capitalize text-sm text-zinc-900 leading-snug">
                        {item.keyword}
                      </h3>
                    </button>

                    {/* Dòng 2: Chia làm 3 phần bằng nhau */}
                    <div className="grid grid-cols-3 items-center gap-2 pt-3 border-t border-zinc-100">
                      {/* Phần 1: Vol TB */}
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-400">Vol TB</span>
                        <span className="text-xs font-bold text-indigo-600">
                          {item.avgSearchVolume.toLocaleString()}
                        </span>
                      </div>

                      {/* Phần 2: Chart */}
                      <button
                        onClick={() => {
                          setModalKeyword(item);
                          setIsModalOpen(true);
                        }}
                        className="h-8 opacity-60 cursor-pointer"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={item.monthlyData}>
                            <Area 
                              type="monotone" 
                              dataKey="volume" 
                              stroke="#6366f1" 
                              fill="rgba(99,102,241,0.1)" 
                              strokeWidth={2}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </button>

                      {/* Phần 3: Gợi ý SEO */}
                      <div className="flex justify-end">
                        <button 
                          onClick={() => fetchSeoSuggestion(item.keyword)}
                          className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 border border-indigo-100 px-2 py-1.5 rounded-lg flex items-center gap-1 transition-all whitespace-nowrap"
                        >
                          <Sparkles className="w-3 h-3" />
                          Gợi ý
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-12 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-8 border-t border-zinc-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-zinc-400">© 2026 Keywords | Du lịch | VnE. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-zinc-400">Powered by Google AI Studio</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Keyword Detail Modal */}
      {isModalOpen && modalKeyword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-5xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-xl">
                  <BarChart2 className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 capitalize">{modalKeyword.keyword}</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <Search className="w-5 h-5 text-zinc-500 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 sm:p-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                  <p className="text-sm font-bold text-indigo-600 mb-1">Volume Trung Bình</p>
                  <p className="text-3xl font-bold text-zinc-900">{modalKeyword.avgSearchVolume.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                  <p className="text-sm font-bold text-emerald-600 mb-1">Dự báo Tăng trưởng</p>
                  <div className={cn(
                    "flex items-center gap-1 text-3xl font-bold",
                    (topTrending.find(t => t.keyword === modalKeyword.keyword)?.forecastGrowth ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {(topTrending.find(t => t.keyword === modalKeyword.keyword)?.forecastGrowth ?? 0) >= 0 ? <ArrowUpRight className="w-8 h-8" /> : <ArrowDownRight className="w-8 h-8" />}
                    {Math.abs(topTrending.find(t => t.keyword === modalKeyword.keyword)?.forecastGrowth ?? 0).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100">
                  <p className="text-sm font-bold text-zinc-500 mb-1">Cạnh tranh</p>
                  <p className="text-3xl font-bold text-zinc-900">{modalKeyword.competition}%</p>
                </div>
              </div>

              <div className="h-[500px] w-full">
                <h4 className="text-lg font-semibold text-zinc-900 mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  Biểu đồ Volume Search 24 tháng gần nhất
                </h4>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={modalKeyword.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="modalColorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717a', fontSize: 12 }}
                      dy={10}
                      minTickGap={20}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717a', fontSize: 12 }}
                      tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                      formatter={(value: number) => [value.toLocaleString(), 'Search Volume']}
                      labelStyle={{ color: '#71717a', fontWeight: 600, marginBottom: '8px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="volume" 
                      stroke="#6366f1" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#modalColorVolume)" 
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* SEO Suggestion Modal */}
      {isSeoModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsSeoModalOpen(false)}
            className="absolute inset-0 bg-zinc-900/80 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-lg font-bold">Gợi ý SEO: <span className="capitalize">{seoKeyword}</span></h3>
              </div>
              <button 
                onClick={() => setIsSeoModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              {isSeoLoading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  <p className="text-zinc-500 font-medium animate-pulse">Gemini đang phân tích từ khóa và lập dàn ý...</p>
                </div>
              ) : (
                <div className="prose prose-zinc max-w-none">
                  <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 mb-8">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold mb-3">
                      <BookOpen className="w-5 h-5" />
                      Chiến lược nội dung đề xuất
                    </div>
                    <p className="text-zinc-600 text-sm leading-relaxed">
                      Dưới đây là phân tích ý định tìm kiếm và dàn ý nội dung được tối ưu hóa để giúp bài viết của bạn đạt thứ hạng cao trên Google Search cho từ khóa <span className="font-bold text-indigo-600">"{seoKeyword}"</span>.
                    </p>
                  </div>
                  
                  <div className="markdown-body">
                    <ReactMarkdown>{seoContent}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50 flex justify-end">
              <button 
                onClick={() => setIsSeoModalOpen(false)}
                className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
