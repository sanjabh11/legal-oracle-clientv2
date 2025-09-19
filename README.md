# Legal Oracle - AI-Powered Legal Intelligence Platform

A comprehensive legal intelligence platform that leverages artificial intelligence, game theory, and real legal data to provide strategic insights for complex legal scenarios.

## 🚀 Features

### Core Capabilities
- **Case Outcome Prediction**: AI-powered analysis using machine learning and legal precedents
- **Judge Behavior Analysis**: Comprehensive analysis of judicial patterns and decision-making tendencies
- **Nash Equilibrium Calculator**: Game theory calculations for multi-party legal scenarios
- **Document Analysis**: AI-powered legal document analysis with NLP models
- **Precedent Search**: Semantic search through legal precedents using embeddings
- **Settlement Analysis**: Calculate optimal settlement strategies using game theory

### Technical Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + Python 3.9+
- **Database**: Supabase (PostgreSQL with vector extensions)
- **AI/ML**: Sentence Transformers, OpenAI GPT (optional), Hugging Face
- **Authentication**: Supabase Auth with JWT tokens
- **Deployment**: Ready for Netlify/Vercel (frontend) + Railway/Render (backend)

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.9+
- Supabase account
- Git

### 1. Clone Repository
```bash
git clone https://github.com/sanjabh11/legal-oracle-clientv2.git
cd legal-oracle-clientv2
```

### 2. Backend Setup
```bash
cd stub_api

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials (see Environment Variables section)
```

### 3. Frontend Setup
```bash
cd legal-oracle-client

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your frontend variables
```

### 4. Database Setup

#### Supabase Configuration
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and API keys
3. Run the database migrations:

```sql
-- Execute the following SQL in your Supabase SQL editor
-- File: docs/delivery/LO-PBI-001/migrations.sql

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Legal cases table
CREATE TABLE legal_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_title TEXT NOT NULL,
    case_summary TEXT,
    case_type VARCHAR(100),
    jurisdiction VARCHAR(100),
    court VARCHAR(200),
    date_decided DATE,
    outcome VARCHAR(50),
    key_facts TEXT[],
    legal_issues TEXT[],
    precedent_value DECIMAL(3,2) DEFAULT 0.5,
    embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Caselaw cache for embeddings
CREATE TABLE caselaw_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    summary TEXT,
    citation VARCHAR(500),
    court VARCHAR(200),
    date_decided DATE,
    embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Judge patterns and analysis
CREATE TABLE judge_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judge_name VARCHAR(200) NOT NULL,
    court VARCHAR(200),
    appointment_date DATE,
    cases_decided INTEGER DEFAULT 0,
    reversal_rate DECIMAL(4,3) DEFAULT 0.000,
    precedent_adherence_score DECIMAL(4,3) DEFAULT 0.500,
    political_leanings VARCHAR(50),
    judicial_philosophy TEXT,
    case_types_handled TEXT[],
    decision_patterns JSONB,
    average_sentence_length DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Precedent relationships
CREATE TABLE precedent_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_case UUID REFERENCES legal_cases(id),
    to_case UUID REFERENCES legal_cases(id),
    relation_type VARCHAR(50) DEFAULT 'cites',
    strength DECIMAL(3,2) DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App configuration
CREATE TABLE app_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_legal_cases_embedding ON legal_cases USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_caselaw_cache_embedding ON caselaw_cache USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_legal_cases_type ON legal_cases(case_type);
CREATE INDEX idx_legal_cases_jurisdiction ON legal_cases(jurisdiction);
CREATE INDEX idx_judge_patterns_name ON judge_patterns(judge_name);
CREATE INDEX idx_judge_patterns_court ON judge_patterns(court);

-- RPC function for nearest neighbor search
CREATE OR REPLACE FUNCTION search_similar_cases(
    query_embedding vector(384),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    title text,
    summary text,
    similarity float
)
LANGUAGE sql
AS $$
    SELECT 
        caselaw_cache.id,
        caselaw_cache.title,
        caselaw_cache.summary,
        1 - (caselaw_cache.embedding <=> query_embedding) AS similarity
    FROM caselaw_cache
    WHERE 1 - (caselaw_cache.embedding <=> query_embedding) > match_threshold
    ORDER BY caselaw_cache.embedding <=> query_embedding
    LIMIT match_count;
$$;
```

### 5. Environment Variables

#### Backend (.env in stub_api/)
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_key_optional
GEMINI_API_KEY=your_gemini_key_optional
HF_API_TOKEN=your_huggingface_token_optional
EMBED_MODEL_NAME=all-MiniLM-L6-v2
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

#### Frontend (.env in legal-oracle-client/)
```bash
VITE_APP_NAME="Legal Oracle"
VITE_API_BASE="http://127.0.0.1:8080/api/v1"
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GEMINI_API_KEY=your_gemini_key_optional
```

### 6. Run the Application

#### Start Backend Server
```bash
cd stub_api
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

#### Start Frontend Development Server
```bash
cd legal-oracle-client
npm run dev
```

Visit `http://localhost:5173` to access the application.

## 📊 Data Ingestion

### Sample Data Import
```bash
cd stub_api
python ingest_cases.py sample_data.jsonl
```

### JSONL Format Example
```json
{"case_title": "Smith v. Jones", "case_summary": "Contract dispute...", "case_type": "contract", "jurisdiction": "federal", "court": "District Court", "outcome": "plaintiff"}
{"case_title": "Doe v. Corporation", "case_summary": "Employment law case...", "case_type": "employment", "jurisdiction": "state", "court": "Superior Court", "outcome": "defendant"}
```

## 🔒 Security Features

- **Environment Variables**: All secrets stored in .env files (gitignored)
- **JWT Authentication**: Supabase-based authentication with secure tokens
- **CORS Protection**: Configured allowed origins
- **Input Validation**: Pydantic models for API validation
- **SQL Injection Prevention**: Parameterized queries via Supabase client
- **Rate Limiting**: Ready for production rate limiting middleware

## 🚀 Deployment

### Frontend (Netlify/Vercel)
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in dashboard

### Backend (Railway/Render)
1. Connect your GitHub repository
2. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Add environment variables in dashboard
4. Enable auto-deploy from main branch

## 📚 API Documentation

### Core Endpoints

#### Case Analysis
- `POST /api/v1/predict_outcome` - Predict case outcomes
- `GET /api/v1/cases` - List legal cases
- `POST /api/v1/search_caselaw` - Semantic search

#### Judge Analysis
- `GET /api/v1/judge_analysis/{judge_id}` - Get judge metrics
- `GET /api/v1/judges` - List judges

#### Game Theory
- `POST /api/v1/nash_equilibrium` - Calculate Nash equilibrium
- `POST /api/v1/analyze_strategy` - Strategy analysis

#### Data Management
- `POST /api/v1/ingest_case` - Bulk import cases
- `GET /api/v1/metrics/model_calibration` - Model performance

### Authentication
All API requests require Authorization header:
```bash
Authorization: Bearer <supabase_jwt_token>
```

## 🧪 Testing

### Frontend Tests
```bash
cd legal-oracle-client
npm test
```

### Backend Tests
```bash
cd stub_api
python -m pytest tests/
```

### API Testing
```bash
# Test prediction endpoint
curl -X POST "http://localhost:8080/api/v1/predict_outcome" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"case_text": "Contract dispute case...", "case_type": "contract"}'
```

## 🔧 Development

### Project Structure
```
legal-oracle-clientv2/
├── legal-oracle-client/          # React frontend
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── lib/                  # Utilities and API clients
│   │   └── hooks/                # Custom React hooks
│   └── public/                   # Static assets
├── stub_api/                     # FastAPI backend
│   ├── main.py                   # Main API server
│   ├── ingest_cases.py          # Data ingestion script
│   └── tests/                    # Backend tests
├── docs/                         # Documentation
│   └── delivery/                 # Project delivery docs
└── supabase/                     # Supabase configuration
```

### Key Components
- **App.tsx**: Main application with routing
- **CasePrediction.tsx**: Case outcome prediction interface
- **JudgeAnalysis.tsx**: Judge behavior analysis
- **NashEquilibrium.tsx**: Game theory calculator
- **DocumentAnalysis.tsx**: Document analysis interface

### Adding New Features
1. Create new component in `src/components/`
2. Add route in `App.tsx`
3. Implement backend endpoint in `stub_api/main.py`
4. Add database tables if needed
5. Update documentation

## 🐛 Troubleshooting

### Common Issues

#### Backend Won't Start
- Check Python version (3.9+ required)
- Verify all environment variables are set
- Install missing dependencies: `pip install -r requirements.txt`

#### Frontend Build Errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version (18+ required)
- Verify environment variables

#### Database Connection Issues
- Verify Supabase URL and keys
- Check network connectivity
- Ensure database migrations are applied

#### API Authentication Errors
- Verify JWT token is valid
- Check Supabase project settings
- Ensure CORS is configured correctly

## 📈 Performance Optimization

### Frontend
- Lazy loading for components
- Image optimization
- Bundle splitting
- Service worker caching

### Backend
- Database indexing on embeddings
- Connection pooling
- Response caching
- Async processing

## 🔮 Pending Features & Roadmap

### High Priority
- [ ] Real-time collaboration features
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Offline mode support

### Medium Priority
- [ ] Multi-language support
- [ ] Advanced search filters
- [ ] Export functionality (PDF/Excel)
- [ ] Integration with legal databases (Westlaw, LexisNexis)

### Low Priority
- [ ] Voice interface
- [ ] AI-powered document generation
- [ ] Blockchain integration for case integrity
- [ ] Advanced visualization tools

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact the development team for enterprise support

## 🙏 Acknowledgments

- Supabase for database and authentication
- OpenAI for language models
- Hugging Face for transformer models
- React and FastAPI communities
- Legal data providers and research institutions

---

**Built with ❤️ for the legal community**
