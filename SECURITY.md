# 🔒 Security Guide - YouTube Video Translator

## 🛡️ API Key and Secrets Protection

### ✅ What's Already Protected

This project currently uses **LibreTranslate** which runs locally, so there are **no API keys to expose**. However, we've set up comprehensive protection for future enhancements.

### 🔐 Protected File Types

The `.gitignore` file automatically protects:

- **Environment files**: `.env`, `.env.local`, `.env.production`
- **API key files**: `*api*key*`, `*secret*`, `*token*`
- **Configuration files**: `secrets.yml`, `config.production.json`
- **LibreTranslate models**: Large model files that shouldn't be in git

### 📋 Security Checklist

#### ✅ Before Every Git Commit

```bash
# 1. Check what files you're about to commit
git status

# 2. Review the actual changes
git diff

# 3. Look for accidentally added sensitive files
git diff --cached --name-only | grep -E "\.(env|key|secret|password)"

# 4. If you find sensitive files, unstage them
git reset HEAD <sensitive-file>
```

#### ✅ Regular Security Audits

```bash
# Check for accidentally committed secrets
grep -r -i "api_key\|password\|secret\|token" . --exclude-dir=node_modules --exclude-dir=target --exclude-dir=.git

# Scan for common secret patterns
grep -r -E "(sk-|pk_|ghp_|gho_|ghu_|ghs_)" . --exclude-dir=node_modules --exclude-dir=target --exclude-dir=.git
```

### 🚨 Emergency: Accidentally Committed Secrets

If you accidentally commit API keys or secrets:

#### 1. **Immediate Actions**
```bash
# Remove the sensitive file and commit
git rm <sensitive-file>
git commit -m "Remove accidentally committed secrets"

# Push immediately
git push origin main
```

#### 2. **Rotate All Compromised Keys**
- Generate new API keys for all exposed services
- Update your local `.env` file with new keys
- Revoke the old keys immediately

#### 3. **Clean Git History (if needed)**
```bash
# Remove file from entire git history (DANGEROUS - use carefully)
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch <sensitive-file>' \
--prune-empty --tag-name-filter cat -- --all

# Force push (warns collaborators)
git push origin --force --all
```

### 🔧 Adding New API Services

When adding services that require API keys:

#### 1. **Add to Environment Template**
```bash
# Edit .env.example
echo "NEW_SERVICE_API_KEY=your-key-here" >> .env.example
```

#### 2. **Create Local Environment File**
```bash
# Copy template and add real values
cp .env.example .env
# Edit .env with your actual API key (this file is gitignored)
```

#### 3. **Use Environment Variables in Code**

**Frontend (React):**
```javascript
// Vite automatically loads VITE_ prefixed variables
const apiKey = import.meta.env.VITE_API_KEY
```

**Backend (Spring Boot):**
```java
@Value("${api.key:default-value}")
private String apiKey;
```

**Python Scripts:**
```python
import os
api_key = os.getenv('API_KEY', 'default-value')
```

### 🔍 Security Scanning Tools

#### Install git-secrets (Recommended)
```bash
# macOS
brew install git-secrets

# Configure for your repo
cd /path/to/your/repo
git secrets --install
git secrets --register-aws
```

#### Pre-commit Hooks
Create `.git/hooks/pre-commit`:
```bash
#!/bin/sh
# Check for common secret patterns
if git diff --cached --name-only | xargs grep -l -E "(api_key|password|secret|token)" 2>/dev/null; then
    echo "❌ ERROR: Potential secrets detected!"
    echo "Files containing sensitive data:"
    git diff --cached --name-only | xargs grep -l -E "(api_key|password|secret|token)" 2>/dev/null
    echo "Please review and remove secrets before committing."
    exit 1
fi
```

### 📁 Recommended Project Structure

```
shpehackathon/
├── .env.example          # Template (committed)
├── .env                  # Your secrets (gitignored)
├── .gitignore           # Protects sensitive files
├── config/
│   ├── public.json      # Public config (committed)
│   └── secrets.json     # Secret config (gitignored)
└── scripts/
    ├── setup.sh         # Public setup (committed)
    └── deploy.sh        # May contain secrets (gitignored)
```

### 🌐 Production Deployment Security

#### Environment Variables in Production
```bash
# Instead of .env files, use system environment variables
export LIBRETRANSLATE_API_KEY="production-key-here"
export DB_PASSWORD="production-db-password"

# Or use a secrets management service
# - AWS Secrets Manager
# - Azure Key Vault  
# - Google Secret Manager
# - HashiCorp Vault
```

#### Docker Security
```dockerfile
# Use multi-stage builds to avoid secrets in final image
FROM node:18 AS build
COPY . .
RUN npm install && npm run build

FROM node:18-alpine
COPY --from=build /app/dist ./dist
# Don't copy .env or secrets to final image
```

### 🚨 Current Security Status

#### ✅ **SECURE** - No API Keys Currently Used
- **LibreTranslate**: Runs locally, no API keys needed
- **YouTube Transcript API**: Uses public YouTube data, no keys needed
- **No database**: No database credentials to protect

#### 🟡 **MONITOR** - Future Considerations  
- If you add external translation APIs (Google, Azure, OpenAI)
- If you add user authentication (JWT secrets)
- If you add database storage (DB passwords)
- If you deploy to cloud services (deployment keys)

### 📞 Security Resources

- **GitHub Security Advisories**: https://github.com/advisories
- **OWASP Security Guide**: https://owasp.org/www-project-top-ten/
- **Git Secrets Tool**: https://github.com/awslabs/git-secrets

---

**Remember: Security is a practice, not a destination. Review regularly! 🛡️**
