import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { Mail, Send, FileEdit, Eye } from 'lucide-react';
import { analyticsService } from '../services/dataService';
import { Loader } from '../components/UI/UI';
import './Analytics.css';

const COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#3b82f6', '#10b981'];
const SENTIMENT_COLORS = { positive: '#10b981', neutral: '#6366f1', negative: '#ef4444' };

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [sentimentData, setSentimentData] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [statsRes, sentimentRes, categoryRes] = await Promise.all([
          analyticsService.getStats(),
          analyticsService.getSentiment(),
          analyticsService.getCategories(),
        ]);
        setStats(statsRes.data);
        setSentimentData(sentimentRes.data);
        setCategoryData(categoryRes.data);
      } catch (err) {
        console.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <Loader size="lg" text="Loading analytics..." />;

  const statCards = [
    { label: 'Received', value: stats?.totalReceived || 0, icon: Mail, color: '#6366f1' },
    { label: 'Sent', value: stats?.totalSent || 0, icon: Send, color: '#8b5cf6' },
    { label: 'Drafts', value: stats?.totalDrafts || 0, icon: FileEdit, color: '#f59e0b' },
    { label: 'Unread', value: stats?.unread || 0, icon: Eye, color: '#ef4444' },
  ];

  const sentimentPieData = sentimentData
    ? Object.entries(sentimentData).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value,
      }))
    : [];

  const categoryPieData = categoryData
    ? categoryData.map((item) => ({
        name: item._id?.charAt(0).toUpperCase() + item._id?.slice(1) || 'Unknown',
        value: item.count,
      }))
    : [];

  // Process emails per day for area chart
  const dailyData = {};
  stats?.emailsPerDay?.forEach((item) => {
    if (!dailyData[item._id.date]) {
      dailyData[item._id.date] = { date: item._id.date, received: 0, sent: 0 };
    }
    dailyData[item._id.date][item._id.type] = item.count;
  });
  const areaChartData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>Analytics Dashboard</h1>
        <p>Your email insights at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="analytics-cards">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            className="analytics-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="analytics-card-icon" style={{ background: `${card.color}15`, color: card.color }}>
              <card.icon size={24} />
            </div>
            <div className="analytics-card-info">
              <span className="analytics-card-value">{card.value}</span>
              <span className="analytics-card-label">{card.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="analytics-charts">
        {/* Email Activity Chart */}
        <motion.div
          className="analytics-chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3>Email Activity (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={areaChartData}>
              <defs>
                <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={12} />
              <YAxis stroke="var(--text-tertiary)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                }}
              />
              <Area type="monotone" dataKey="received" stroke="#6366f1" fill="url(#colorReceived)" strokeWidth={2} />
              <Area type="monotone" dataKey="sent" stroke="#8b5cf6" fill="url(#colorSent)" strokeWidth={2} />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Sentiment Pie */}
        <motion.div
          className="analytics-chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3>Sentiment Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sentimentPieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {sentimentPieData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={SENTIMENT_COLORS[entry.name.toLowerCase()] || COLORS[index]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category Bar */}
        <motion.div
          className="analytics-chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3>Email Categories</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryPieData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={12} />
              <YAxis stroke="var(--text-tertiary)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {categoryPieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
