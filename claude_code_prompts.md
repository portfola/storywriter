# Claude Code Prompts for StoryWriter Project

### Frontend Security Update

```
Remove all API keys from app.config.js and frontend code.
Update all service classes to use backend API endpoints instead of direct external API calls.
Add authentication headers to API requests.
Implement proper error handling for backend API failures.
```

### Frontend Integration Update

```
Update frontend services to use Laravel backend instead of direct API calls:

Create new environment variable in app.config.js:
- API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:8000'

Update services/elevenLabsService.ts:
- Replace direct ElevenLabs SDK calls with HTTP requests to Laravel backend
- Update startConversationAgent() to call POST /api/conversation/start
- Update endConversation() to call POST /api/conversation/end  
- Add WebSocket connection to /ws/conversation/{sessionId}
- Remove ELEVENLABS_API_KEY from frontend config

Update services/storyGenerationService.ts:
- Replace direct Together AI calls with POST /api/stories/generate
- Update generateStoryFromTranscript() method
- Remove TOGETHER_API_KEY from frontend config

Update services/index.ts:
- Remove API key references from service configuration comments
- Update documentation to reference backend integration

Requirements:
- Maintain same frontend interface (no breaking changes)
- Add proper error handling for network failures
- Implement request timeout handling
- Add authentication headers for future user auth
- Keep offline mode considerations for mobile app
```

### Frontend Environment Configuration

```
Update production .env for backend integration:

# Backend Integration
API_BASE_URL=https://api.yourdomain.com

# Remove these (now handled by backend):
# ELEVENLABS_API_KEY=
# TOGETHER_API_KEY=

# Keep for alternative services:
HUGGING_FACE_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

Requirements:
- Update app.config.js to use API_BASE_URL
- Remove deprecated API key environment variables
- Update service documentation
- Test backend connectivity on app startup
```

### Frontend Deployment Pipeline

```
Update .github/workflows/develop-frontend.yml for production deployment:

1. Build Expo web application with production API_BASE_URL
2. Run frontend tests and linting
3. Deploy to S3 bucket for static hosting
4. Invalidate CloudFront distribution
5. Update DNS if needed

Add environment-specific builds:
- Staging: API_BASE_URL=https://api-staging.yourdomain.com
- Production: API_BASE_URL=https://api.yourdomain.com

Requirements:
- Use GitHub secrets for AWS credentials
- Add build validation steps
- Include rollback capabilities
- Test backend connectivity after deployment
```

### Fix ESLint configuration
```
Fix ESLint configuration for Expo project with flat config format.

Update eslint.config.js to properly handle TypeScript files in src/ directory and app/ directory.

Requirements:
- Support .ts, .tsx, .js, .jsx files
- Include app/ and src/ directories  
- Exclude node_modules, dist, .expo
- Use @typescript-eslint/parser for TypeScript files
- Add @typescript-eslint/eslint-plugin
- Configure rules for React Native/Expo development
- Ensure compatibility with ESLint 9 flat config

Install required dependencies:
npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin

Test configuration with: npm run lint
```

### Fix ESLint errors
```
Fix ESLint errors in TypeScript React Native project.

Fix the following specific issues:

1. app/+not-found.tsx - Remove unused ThemedView import
2. app/_layout.tsx - Remove unused Stack import and fix 4 floating promises by adding proper error handling
3. components/ConversationInterface/ConversationInterface.tsx - Fix floating promise and missing dependency in useCallback
4. components/Footer/Footer.tsx - Remove unused StyleSheet import  
5. src/stores/conversationStore.ts - Fix floating promise with proper error handling
6. src/utils/errorHandler.ts - Fix unused 'message' parameter by prefixing with underscore

For floating promises, use one of these patterns:
- Add .catch(error => Logger.error(...)) for fire-and-forget operations
- Add void prefix for intentionally ignored promises
- Add proper await with try/catch blocks

For React hooks warnings, wrap arrays in useMemo() and add missing dependencies to dependency arrays.

Requirements:
- Maintain existing functionality
- Add proper error handling for promises
- Follow TypeScript best practices
- Ensure no breaking changes to component interfaces
```

## Frontend Infrastructure Import

### Frontend Resource Discovery Script
```
Create scripts/discover-frontend-resources.sh for resource detection.

Script should detect and output existing AWS resources:

1. S3 buckets matching pattern storywriter-*-frontend
2. CloudFront distributions pointing to those buckets
3. Route53 records for staging.storywriter.net and storywriter.net
4. ACM certificates for *.storywriter.net
5. Any IAM policies related to frontend deployment

Output format should:
- Generate terraform.tfvars with conditional creation flags
- Create import commands for existing resources
- Validate resource relationships (CloudFront→S3, Route53→CloudFront)

Requirements:
- Include dry-run mode
- Add comprehensive logging and error handling
- Generate both staging and production configurations
- Check for orphaned resources (CloudFront without S3, etc.)
```

### Frontend Terraform Configuration
```
Create terraform/frontend/ directory structure matching backend pattern.

Directory structure:
terraform/frontend/
├── staging/
│   ├── main.tf                 # S3, CloudFront, Route53 configuration
│   ├── terraform.tfvars.example
│   └── terraform.tfvars        # Generated by discovery script
└── production/
    ├── main.tf                 # Production configuration
    └── terraform.tfvars

Configuration should include:
- S3 bucket with static website hosting
- CloudFront distribution with proper caching
- Route53 records for domain mapping
- ACM certificate references
- IAM policies for GitHub Actions deployment

Backend configuration:
- bucket: storywriter-terraform-state
- key: frontend/{environment}/terraform.tfstate
- region: us-east-1  
- dynamodb_table: storywriter-terraform-locks

Requirements:
- Use conditional resource creation like backend
- Share tagging strategy with backend
- Add lifecycle protection for critical resources
- Output CloudFront distribution ID for GitHub Actions
```

## Shared Documentation

### Environment Variables Reference

```
# Backend (.env)
AWS_REGION=us-east-1
SECRETS_MANAGER_ENABLED=true
ELEVENLABS_SECRET_NAME=prod/storywriter/elevenlabs-key
TOGETHER_SECRET_NAME=prod/storywriter/together-key
FRONTEND_URL=https://app.yourdomain.com

# Frontend (app.config.js)
API_BASE_URL=https://api.yourdomain.com

# Development
API_BASE_URL=http://localhost:8000 (frontend)
FRONTEND_URL=http://localhost:8081 (backend)
```

### Testing Commands

```
# Backend
./vendor/bin/sail artisan secrets:test
./vendor/bin/sail artisan test
./vendor/bin/sail composer audit

# Frontend  
npm run validate
npm run test
npm run build
```

### Deployment Checklist

```
Backend Deployment:
□ Secrets stored in AWS Secrets Manager
□ Database migrations run
□ Health check endpoint responding
□ CORS configured for frontend domain
□ Rate limiting configured
□ Logging configured

Frontend Deployment:
□ API_BASE_URL pointing to production backend
□ S3 bucket configured for static hosting
□ CloudFront distribution configured
□ SSL certificate configured
□ Backend connectivity verified
```
