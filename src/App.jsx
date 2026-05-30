import { useState } from 'react';
import axios from 'axios';
import { 
  PieChart, Pie, Cell, Tooltip as PieTooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip 
} from 'recharts';
import './App.css';

function App() {
  const [appId, setAppId] = useState('730'); // Mặc định là CS:GO
  const [liveStats, setLiveStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [reviewText, setReviewText] = useState('');
  const [singlePrediction, setSinglePrediction] = useState(null);

  // Màu sắc: Xanh lá (Tích cực), Đỏ (Tiêu cực), Vàng (Trung lập)
  const COLORS = ['#00C49F', '#FF6B6B', '#FFBB28'];

  // Cào dữ liệu Live từ Steam
  const handleFetchLive = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:8000/api/steam-live/${appId}`);
      setLiveStats(response.data);
    } catch (err) {
      setError("Không thể tải dữ liệu. Hãy kiểm tra lại App ID.");
    } finally {
      setLoading(false);
    }
  };

  // Phân tích câu đơn
  const handleAnalyzeSingle = async () => {
    if (!reviewText.trim()) return;
    try {
      const response = await axios.post('http://localhost:8000/api/predict', { text: reviewText });
      setSinglePrediction(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', color: '#171a21' }}>🚀 Steam NLP Sentiment Dashboard</h1>
      
      <div style={{ display: 'flex', gap: '30px', marginTop: '30px' }}>
        
        {/* CỘT TRÁI: DỮ LIỆU LIVE TỪ STEAM */}
        <div style={{ flex: 2, border: '1px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: '#f4f6f9' }}>
          <h2>📡 Live Data Pipeline (100 Reviews mới nhất)</h2>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input 
              type="text" 
              value={appId} 
              onChange={(e) => setAppId(e.target.value)} 
              placeholder="Nhập Steam App ID (VD: 271590)"
              style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button 
              onClick={handleFetchLive} 
              disabled={loading}
              style={{ padding: '10px 20px', backgroundColor: '#1b2838', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
            >
              {loading ? 'Đang phân tích...' : 'Cào & Phân tích'}
            </button>
          </div>

          {error && <p style={{ color: 'red' }}>{error}</p>}

          {liveStats && (
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3 style={{ textAlign: 'center', margin: '0 0 20px 0' }}>Kết quả Quét Dữ liệu: {liveStats.game_name}</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap' }}>
                
                {/* 1. BIỂU ĐỒ TRÒN (Tỷ lệ) */}
                <div style={{ textAlign: 'center' }}>
                  <h4>Tỷ lệ Phần trăm</h4>
                  <PieChart width={300} height={250}>
                    <Pie data={liveStats.sentiment_distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {liveStats.sentiment_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <PieTooltip />
                    <Legend />
                  </PieChart>
                </div>

                {/* 2. BIỂU ĐỒ CỘT (Số lượng) */}
                <div style={{ textAlign: 'center' }}>
                  <h4>Phân bổ Số lượng Cụ thể</h4>
                  <BarChart width={350} height={250} data={liveStats.sentiment_distribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <BarTooltip cursor={{fill: '#f4f6f9'}} />
                    <Bar dataKey="value" radius={[5, 5, 0, 0]} barSize={50}>
                      {liveStats.sentiment_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: TEST AI ĐƠN LẺ */}
        <div style={{ flex: 1, border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
          <h2>Phân tích Cảm xúc</h2>
          <p>Nhập bình luận:</p>
          
          <textarea 
            rows="4"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button 
            onClick={handleAnalyzeSingle} 
            style={{ padding: '10px 20px', backgroundColor: '#66c0f4', color: 'black', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '4px', width: '100%' }}
          >
            Test Cảm xúc
          </button>

          {singlePrediction && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e1f5fe', borderRadius: '4px', borderLeft: '5px solid #66c0f4' }}>
              <p><strong>Phân loại:</strong> {singlePrediction.prediction}</p>
              <p><strong>Độ chắc chắn:</strong> {singlePrediction.confidence}%</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;