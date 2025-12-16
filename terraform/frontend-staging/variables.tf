variable "environment" {
  description = "Environment name (staging/production)"
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "domain_name" {
  description = "Domain name for the frontend application"
  type        = string
  default     = "storywriter.net"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for static website hosting"
  type        = string
  default     = "storywriter-staging-frontend"
}

variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}