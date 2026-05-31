import { useState } from 'react';
import axios from 'axios';
import { 
  PieChart, Pie, Cell, Tooltip as PieTooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip,
  ResponsiveContainer // <-- Thêm công cụ co giãn tự động
} from 'recharts';
import './App.css';

function App() {
  const [appId, setAppId] = useState('730');
  const [liveStats, setLiveStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [reviewText, setReviewText] = useState('');
  const [singlePrediction, setSinglePrediction] = useState(null);

  // ⚠️ BẠN HÃY DÁN ĐƯỜNG LINK RENDER CỦA BẠN VÀO ĐÂY:
  const API_URL = "https://steam-2h9a.onrender.com";

  const COLORS = ['#00C49F', '#FF6B6B', '#FFBB28'];

  const handleFetchLive = async () => {
    setLoading(true);
    setError(null);
    try {
      // Đã đổi localhost thành API_URL
      const response = await axios.get(`${API_URL}/api/steam-live/${appId}`);
      setLiveStats(response.data);
    } catch (err) {
      setError("Unable to load data. Please check your App ID or wait for the backend to restart.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeSingle = async () => {
    if (!reviewText.trim()) return;
    try {
      // Đã đổi localhost thành API_URL
      const response = await axios.post(`${API_URL}/api/predict`, { text: reviewText });
      setSinglePrediction(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', color: '#ffffff', fontSize: 'clamp(1.5rem, 5vw, 2.5rem)' }}>
         Steam NLP Dashboard
      </h1>
      
      {/* flexWrap: 'wrap' giúp 2 cột tự rớt xuống thành hàng dọc trên Mobile */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', marginTop: '30px' }}>
        
        {/* CỘT TRÁI */}
        <div style={{ flex: '1 1 300px', border: '1px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: '#000000' }}>
          <h2> Live Data Pipeline</h2>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              value={appId} 
              onChange={(e) => setAppId(e.target.value)} 
              placeholder="Steam App ID"
              style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px' }}
            />
            <button 
              onClick={handleFetchLive} 
              disabled={loading}
              style={{ padding: '10px 20px', backgroundColor: '#1b2838', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '4px', flex: '1 1 100px' }}
            >
              {loading ? 'Waiting...' : 'Search'}
            </button>
          </div>

          {error && <p style={{ color: 'red' }}>{error}</p>}

          {liveStats && (
            <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3 style={{ textAlign: 'center', margin: '0 0 20px 0' }}>{liveStats.game_name}</h3>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                
                {/* BIỂU ĐỒ TRÒN - Đã dùng ResponsiveContainer */}
                <div style={{ width: '100%', maxWidth: '350px', height: '350px', marginBottom: '40px' }}>
                  <h4 style={{ textAlign: 'center' }}>Percentage</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={liveStats.sentiment_distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {liveStats.sentiment_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <PieTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* BIỂU ĐỒ CỘT - Đã dùng ResponsiveContainer */}
                <div style={{ width: '100%', maxWidth: '400px', height: '300px' }}>
                  <h4 style={{ textAlign: 'center', marginTop: '20px' }}>Quantity distribution</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={liveStats.sentiment_distribution} margin={{ top: 20, right: 30, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 12}} />
                      <YAxis tick={{fontSize: 12}} />
                      <BarTooltip cursor={{fill: '#f4f6f9'}} />
                      <Bar dataKey="value" radius={[5, 5, 0, 0]} barSize={40}>
                        {liveStats.sentiment_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI */}
        <div style={{ flex: '1 1 300px', border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
          <h2>Comment analysis</h2>
          <p>Enter any review sentence:</p>
          
          <textarea 
            rows="4"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
          <button 
            onClick={handleAnalyzeSingle} 
            style={{ padding: '10px 20px', backgroundColor: '#66c0f4', color: 'black', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '4px', width: '100%' }}
          >
            Test Sentiment 
          </button>

          {singlePrediction && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e1f5fe', borderRadius: '4px', borderLeft: '5px solid #66c0f4' }}>
              <p><strong>Classify:</strong> {singlePrediction.prediction}</p>
              <p><strong>Confidence:</strong> {singlePrediction.confidence}%</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;