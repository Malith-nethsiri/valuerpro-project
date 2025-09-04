/**
 * Frontend environment configuration validation
 */

interface EnvConfig {
  apiUrl: string
  environment: string
  googleMapsApiKey?: string
  version: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  config: Partial<EnvConfig>
}

class EnvironmentValidator {
  private static instance: EnvironmentValidator
  private validatedConfig: EnvConfig | null = null

  private constructor() {}

  static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator()
    }
    return EnvironmentValidator.instance
  }

  /**
   * Validate all environment variables
   */
  validate(): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const config: Partial<EnvConfig> = {}

    // Validate API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl) {
      errors.push('NEXT_PUBLIC_API_URL is required')
    } else {
      try {
        new URL(apiUrl)
        config.apiUrl = apiUrl
        
        // Security check for production
        if (process.env.NODE_ENV === 'production' && apiUrl.includes('localhost')) {
          warnings.push('API URL points to localhost in production environment')
        }
      } catch {
        errors.push('NEXT_PUBLIC_API_URL is not a valid URL')
      }
    }

    // Validate environment
    const environment = process.env.NODE_ENV || 'development'
    config.environment = environment

    // Validate Google Maps API key (optional)
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (googleMapsApiKey) {
      if (googleMapsApiKey.includes('your-google-maps-api-key')) {
        warnings.push('Google Maps API key appears to be a placeholder value')
      } else {
        config.googleMapsApiKey = googleMapsApiKey
      }
    }

    // Get version from package.json if available
    config.version = process.env.NEXT_PUBLIC_VERSION || '0.1.0'

    // Production-specific validations
    if (environment === 'production') {
      this.validateProduction(config, errors, warnings)
    }

    const isValid = errors.length === 0

    if (isValid) {
      this.validatedConfig = config as EnvConfig
    }

    return {
      isValid,
      errors,
      warnings,
      config
    }
  }

  /**
   * Get validated configuration (throws if not validated)
   */
  getConfig(): EnvConfig {
    if (!this.validatedConfig) {
      const result = this.validate()
      if (!result.isValid) {
        throw new Error(`Environment validation failed: ${result.errors.join(', ')}`)
      }
    }
    return this.validatedConfig!
  }

  /**
   * Production-specific validations
   */
  private validateProduction(
    config: Partial<EnvConfig>, 
    errors: string[], 
    warnings: string[]
  ): void {
    // Check for development artifacts
    if (config.apiUrl?.includes('localhost') || config.apiUrl?.includes('127.0.0.1')) {
      errors.push('API URL cannot point to localhost in production')
    }

    // Check for missing production-required configs
    if (!config.googleMapsApiKey) {
      warnings.push('Google Maps API key not configured - map features may not work')
    }

    // Check for secure connections
    if (config.apiUrl && !config.apiUrl.startsWith('https://')) {
      warnings.push('API URL should use HTTPS in production')
    }

    // Check for debug flags
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      warnings.push('Debug mode is enabled in production')
    }
  }

  /**
   * Log validation results
   */
  logValidation(): void {
    const result = this.validate()
    
    if (result.isValid) {
      console.log('✅ Environment validation successful')
      console.log(`Environment: ${result.config.environment}`)
      console.log(`API URL: ${result.config.apiUrl}`)
      
      if (result.warnings.length > 0) {
        console.warn('⚠️  Environment warnings:')
        result.warnings.forEach(warning => console.warn(`  - ${warning}`))
      }
    } else {
      console.error('❌ Environment validation failed')
      result.errors.forEach(error => console.error(`  - ${error}`))
    }
  }
}

// Create and export singleton instance
export const envValidator = EnvironmentValidator.getInstance()

// Export configuration getter
export const getEnvConfig = (): EnvConfig => {
  return envValidator.getConfig()
}

// Export validation function
export const validateEnvironment = (): ValidationResult => {
  return envValidator.validate()
}

// Validate environment on module load in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Delay validation slightly to avoid hydration issues
  setTimeout(() => {
    envValidator.logValidation()
  }, 100)
}