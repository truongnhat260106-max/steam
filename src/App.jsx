import { useState } from 'react';
import axios from 'axios';
import { 
  PieChart, Pie, Cell, Tooltip as PieTooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip,
  ResponsiveContainer 
} from 'recharts';
import './App.css';

function App() {
  const [appId, setAppId] = useState('730');
  const [liveStats, setLiveStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [reviewText, setReviewText] = useState('');
  const [singlePrediction, setSinglePrediction] = useState(null);

  // Link API của Render
  const API_URL = "https://steam-2h9a.onrender.com"; 

  const COLORS = ['#00C49F', '#FF6B6B', '#FFBB28'];

  const handleFetchLive = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/steam-live/${appId}`);
      if(response.data.error) throw new Error(response.data.error);
      setLiveStats(response.data);
    } catch (err) {
      setError("Failed to fetch data. Please check the App ID or try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeSingle = async () => {
    if (!reviewText.trim()) return;
    try {
      const response = await axios.post(`${API_URL}/api/predict`, { text: reviewText });
      setSinglePrediction(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getBadgeColor = (label) => {
    if (label.toLowerCase().includes('positive')) return '#00C49F';
    if (label.toLowerCase().includes('negative')) return '#FF6B6B';
    return '#FFBB28'; // Neutral
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1400px', margin: '0 auto', backgroundColor: '#1b2838', color: '#c7d5e0', minHeight: '100vh' }}>
      
      <h1 style={{ textAlign: 'center', color: '#ffffff', fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', marginBottom: '30px' }}>
         Steam Review
      </h1>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          value={appId} 
          onChange={(e) => setAppId(e.target.value)} 
          placeholder="Enter Steam App ID (e.g., 730)"
          style={{ padding: '15px', borderRadius: '8px', border: 'none', minWidth: '250px', fontSize: '16px', backgroundColor: '#2a475e', color: 'white' }}
        />
        <button 
          onClick={handleFetchLive} 
          disabled={loading}
          style={{ padding: '15px 30px', backgroundColor: '#66c0f4', color: '#171a21', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '8px', fontSize: '16px' }}
        >
          {loading ? 'Please wait...' : 'Search'}
        </button>
      </div>

      {error && <p style={{ color: '#FF6B6B', textAlign: 'center' }}>{error}</p>}

      {liveStats && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
          
          {/* LEFT COLUMN */}
          <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Game Info Box */}
            <div style={{ backgroundColor: '#171a21', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
              <img src={liveStats.game_info.header_image} alt="Game Banner" style={{ width: '100%', display: 'block' }} />
              <div style={{ padding: '20px' }}>
                <h2 style={{ color: 'white', margin: '0 0 10px 0' }}>{liveStats.game_info.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#00C49F', borderRadius: '50%' }}></span>
                  <strong style={{ color: '#00C49F' }}>{liveStats.game_info.current_players.toLocaleString()} players in-game</strong>
                </div>
                <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#8f98a0', fontStyle: 'italic' }}>
                  {liveStats.game_info.description}
                </p>
              </div>
            </div>

            {/* Charts Box */}
            <div style={{ backgroundColor: '#171a21', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
              <h3 style={{ textAlign: 'center', color: 'white' }}>Sentiment Overview</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: '350px', height: '350px', marginBottom: '20px' }}>
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
                <div style={{ width: '100%', maxWidth: '400px', height: '350px', paddingBottom: '30px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={liveStats.sentiment_distribution} margin={{ top: 20, right: 30, left: -20, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a475e" />
                      <XAxis dataKey="name" tick={{fill: '#c7d5e0', fontSize: 12}} />
                      <YAxis tick={{fill: '#c7d5e0', fontSize: 12}} />
                      <BarTooltip cursor={{fill: '#2a475e'}} />
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
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Input Review Box */}
            <div style={{ backgroundColor: '#171a21', padding: '20px', borderRadius: '12px', borderTop: '4px solid #66c0f4', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
              <h3 style={{ color: 'white', marginTop: 0 }}> Your Review Here</h3>
            
              
              <textarea 
                rows="4"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Type your review here..."
                style={{ width: '100%', padding: '15px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #2a475e', backgroundColor: '#2a475e', color: 'white', boxSizing: 'border-box' }}
              />
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleAnalyzeSingle} style={{ flex: 1, padding: '12px', backgroundColor: '#66c0f4', color: '#171a21', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '8px' }}>
                  Check
                </button>
                <button onClick={() => window.open(`https://store.steampowered.com/app/${appId}`, "_blank")} style={{ flex: 1, padding: '12px', backgroundColor: '#4c6b22', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '8px' }}>
                  Post on Steam
                </button>
              </div>

              {singlePrediction && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#2a475e', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>AI Label:</span>
                  <strong style={{ color: getBadgeColor(singlePrediction.prediction) }}>{singlePrediction.prediction} ({singlePrediction.confidence}%)</strong>
                </div>
              )}
            </div>

            {/* Live Feed Box */}
            <div style={{ backgroundColor: '#171a21', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', flexGrow: 1, maxHeight: '800px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: 'white', marginTop: 0 }}>💬 Live Review Feed</h3>
              
              <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '10px' }}>
                {liveStats.reviews.map((rev, idx) => (
                  <div key={idx} style={{ backgroundColor: '#2a475e', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontWeight: 'bold', color: '#66c0f4' }}>User_{rev.author.slice(-6)}...</span>
                      <span style={{ backgroundColor: getBadgeColor(rev.label), color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        {rev.label}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: '#c7d5e0' }}>
                      {rev.text.length > 250 ? rev.text.substring(0, 250) + '...' : rev.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default App;