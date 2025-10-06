#!/bin/bash

#
# Frontend Duplicate Resources Cleanup Script
# 
# This script identifies and cleans up duplicate frontend resources:
# - Multiple S3 buckets with similar names
# - Orphaned CloudFront distributions
# - Unused Route53 records
# - Conflicting domain configurations
# - Duplicate ACM certificates
#
# Safety features:
# - Dry-run mode by default
# - Interactive confirmation for each deletion
# - Backup existing configurations before cleanup
# - Skip deletion if resource is referenced by Terraform state
#

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/cleanup-frontend-duplicates-$(date +%Y%m%d_%H%M%S).log"
BACKUP_DIR="/tmp/frontend-cleanup-backup-$(date +%Y%m%d_%H%M%S)"
CLEANUP_REPORT="/tmp/cleanup-report-$(date +%Y%m%d_%H%M%S).json"

# Default values
DRY_RUN=true
INTERACTIVE=true
ENVIRONMENT=""
FORCE=false
VERBOSE=false
AWS_REGION="us-east-1"
APP_NAME="storywriter"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Identify and clean up duplicate frontend resources for StoryWriter.

OPTIONS:
    --real-run              Execute actual cleanup (default is dry-run)
    --force                 Skip interactive confirmation
    --environment ENV       Target specific environment (staging/production)
    --region REGION         AWS region (default: us-east-1)
    --help                  Show this help message

EXAMPLES:
    $0                                    # Dry-run with interactive mode
    $0 --real-run --environment staging   # Clean staging environment
    $0 --real-run --force                 # Non-interactive cleanup

SAFETY:
    - Dry-run mode by default shows what would be deleted
    - Interactive confirmation for each deletion unless --force is used
    - Backups are created before any deletions
    - Resources managed by Terraform are skipped
EOF
}

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }
log_success() { log "SUCCESS" "$@"; }
log_verbose() { 
    if [[ "${VERBOSE:-false}" == "true" ]]; then
        log "VERBOSE" "$@"
    fi
}

# Progress indicator
show_progress() {
    echo -e "${BLUE}▶${NC} $1"
}

# Initialize cleanup report
init_cleanup_report() {
    mkdir -p "$BACKUP_DIR"
    cat > "$CLEANUP_REPORT" << EOF
{
  "cleanup_date": "$(date -Iseconds)",
  "dry_run": $DRY_RUN,
  "environment": "$ENVIRONMENT",
  "summary": {
    "s3_buckets_found": 0,
    "s3_buckets_deleted": 0,
    "cloudfront_distributions_found": 0,
    "cloudfront_distributions_deleted": 0,
    "route53_records_found": 0,
    "route53_records_deleted": 0,
    "acm_certificates_found": 0,
    "acm_certificates_deleted": 0
  },
  "details": {
    "s3_buckets": [],
    "cloudfront_distributions": [],
    "route53_records": [],
    "acm_certificates": []
  },
  "errors": []
}
EOF
}

# Update cleanup report
update_report() {
    local resource_type="$1"
    local action="$2"
    local resource_data="$3"
    
    # Validate inputs
    if [ -z "$resource_type" ] || [ -z "$action" ]; then
        log_warn "Invalid parameters passed to update_report"
        return
    fi
    
    # Validate resource_data is valid JSON
    if [ -n "$resource_data" ] && [ "$resource_data" != "null" ]; then
        if ! echo "$resource_data" | jq empty 2>/dev/null; then
            log_warn "Invalid JSON data passed to update_report for $resource_type $action, using placeholder"
            resource_data='{"error": "invalid_json", "original_data": "'"${resource_data//\"/\\\"}"'"}'
        fi
    else
        resource_data='{"error": "empty_data"}'
    fi
    
    # Validate cleanup report file exists and is valid JSON
    if [ ! -f "$CLEANUP_REPORT" ] || ! jq empty "$CLEANUP_REPORT" 2>/dev/null; then
        log_warn "Cleanup report file is missing or invalid, skipping update"
        return
    fi
    
    local temp_file=$(mktemp)
    
    # Use jq with error handling
    if jq --arg type "$resource_type" --arg action "$action" --argjson data "$resource_data" '
        if $action == "found" then
            .summary[($type + "_found")] += 1 |
            .details[$type] += [$data]
        elif $action == "deleted" then
            .summary[($type + "_deleted")] += 1
        else
            .errors += [{
                "type": $type,
                "action": $action,
                "data": $data,
                "timestamp": now
            }]
        end
    ' "$CLEANUP_REPORT" > "$temp_file" 2>/dev/null; then
        mv "$temp_file" "$CLEANUP_REPORT"
    else
        log_warn "Failed to update cleanup report for $resource_type $action"
        rm -f "$temp_file"
    fi
}

# Check if AWS CLI is available and configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS CLI not configured or credentials not available."
        exit 1
    fi
    
    local caller_identity=$(aws sts get-caller-identity --output json)
    log_info "AWS CLI configured for account: $(echo "$caller_identity" | jq -r '.Account')"
}

# Check if resource is managed by Terraform
is_terraform_managed() {
    local resource_type="$1"
    local resource_identifier="$2"
    
    # Check all Terraform state files in the project
    find "$PROJECT_ROOT" -name "terraform.tfstate" -o -name "*.tfstate" | while read -r state_file; do
        if [ -f "$state_file" ] && [ -s "$state_file" ]; then
            case "$resource_type" in
                "s3_bucket")
                    if jq -e --arg bucket "$resource_identifier" '.resources[]? | select(.type == "aws_s3_bucket") | select(.instances[].attributes.bucket == $bucket)' "$state_file" &> /dev/null; then
                        return 0
                    fi
                    ;;
                "cloudfront_distribution")
                    if jq -e --arg dist_id "$resource_identifier" '.resources[]? | select(.type == "aws_cloudfront_distribution") | select(.instances[].attributes.id == $dist_id)' "$state_file" &> /dev/null; then
                        return 0
                    fi
                    ;;
                "route53_record")
                    local zone_id=$(echo "$resource_identifier" | cut -d'/' -f1)
                    local record_name=$(echo "$resource_identifier" | cut -d'/' -f2)
                    if jq -e --arg zone "$zone_id" --arg name "$record_name" '.resources[]? | select(.type == "aws_route53_record") | select(.instances[].attributes.zone_id == $zone and .instances[].attributes.name == $name)' "$state_file" &> /dev/null; then
                        return 0
                    fi
                    ;;
                "acm_certificate")
                    if jq -e --arg cert_arn "$resource_identifier" '.resources[]? | select(.type == "aws_acm_certificate") | select(.instances[].attributes.arn == $cert_arn)' "$state_file" &> /dev/null; then
                        return 0
                    fi
                    ;;
            esac
        fi
    done
    return 1
}

# Create backup of resource configuration
backup_resource() {
    local resource_type="$1"
    local resource_data="$2"
    
    local backup_file="$BACKUP_DIR/${resource_type}_backup.json"
    
    if [ ! -f "$backup_file" ]; then
        echo "[]" > "$backup_file"
    fi
    
    local temp_file=$(mktemp)
    jq --argjson data "$resource_data" '. += [$data]' "$backup_file" > "$temp_file" && mv "$temp_file" "$backup_file"
    log_info "Backed up $resource_type configuration to $backup_file"
}

# Confirm deletion with user
confirm_deletion() {
    local resource_type="$1"
    local resource_name="$2"
    
    if [ "$INTERACTIVE" = true ] && [ "$DRY_RUN" = false ]; then
        echo -e "${YELLOW}Are you sure you want to delete $resource_type '$resource_name'? (y/N)${NC}"
        read -r response
        case "$response" in
            [yY][eE][sS]|[yY])
                return 0
                ;;
            *)
                log_info "Skipping deletion of $resource_type '$resource_name'"
                return 1
                ;;
        esac
    fi
    return 0
}

# Find duplicate S3 buckets
find_duplicate_s3_buckets() {
    show_progress "Scanning for duplicate S3 buckets..."
    
    local buckets_json=$(aws s3api list-buckets --query 'Buckets[*].[Name,CreationDate]' --output json)
    local app_buckets=$(echo "$buckets_json" | jq -r --arg app "$APP_NAME" '.[] | select(.[0] | contains($app)) | .[0]')
    
    local duplicates=()
    local seen_patterns=()
    
    while IFS= read -r bucket; do
        if [ -n "$bucket" ]; then
            # Extract pattern (remove environment-specific parts)
            local pattern=$(echo "$bucket" | sed -E 's/(staging|production|dev|test)-?//g' | sed -E 's/-?[0-9]+$//')
            
            local is_duplicate=false
            for seen_pattern in "${seen_patterns[@]}"; do
                if [ "$pattern" = "$seen_pattern" ]; then
                    duplicates+=("$bucket")
                    is_duplicate=true
                    break
                fi
            done
            
            if [ "$is_duplicate" = false ]; then
                seen_patterns+=("$pattern")
            fi
        fi
    done <<< "$app_buckets"
    
    for bucket in "${duplicates[@]}"; do
        if [ -n "$ENVIRONMENT" ]; then
            # If environment is specified, only consider buckets NOT matching that environment
            if echo "$bucket" | grep -q "$ENVIRONMENT"; then
                continue
            fi
        fi
        
        local bucket_info=$(aws s3api head-bucket --bucket "$bucket" 2>/dev/null && echo "exists" || echo "not_found")
        if [ "$bucket_info" = "exists" ]; then
            local bucket_data=$(echo "$buckets_json" | jq --arg bucket "$bucket" '.[] | select(.[0] == $bucket)')
            update_report "s3_buckets" "found" "$bucket_data"
            
            log_warn "Found potential duplicate S3 bucket: $bucket"
            
            if is_terraform_managed "s3_bucket" "$bucket"; then
                log_info "Skipping $bucket - managed by Terraform"
            else
                process_s3_bucket_deletion "$bucket" "$bucket_data"
            fi
        fi
    done
}

# Process S3 bucket deletion
process_s3_bucket_deletion() {
    local bucket="$1"
    local bucket_data="$2"
    
    if confirm_deletion "S3 bucket" "$bucket"; then
        backup_resource "s3_bucket" "$bucket_data"
        
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] Would delete S3 bucket: $bucket"
        else
            # First, delete all objects in the bucket
            log_info "Emptying S3 bucket: $bucket"
            aws s3 rm "s3://$bucket" --recursive --quiet || log_error "Failed to empty bucket $bucket"
            
            # Delete the bucket
            log_info "Deleting S3 bucket: $bucket"
            if aws s3api delete-bucket --bucket "$bucket" 2>/dev/null; then
                log_success "Successfully deleted S3 bucket: $bucket"
                update_report "s3_buckets" "deleted" "$bucket_data"
            else
                log_error "Failed to delete S3 bucket: $bucket"
                update_report "s3_buckets" "error" "$bucket_data"
            fi
        fi
    fi
}

# Find orphaned CloudFront distributions
find_orphaned_cloudfront_distributions() {
    show_progress "Scanning for orphaned CloudFront distributions..."
    
    local distributions=$(aws cloudfront list-distributions --query 'DistributionList.Items[*]' --output json 2>/dev/null || echo "[]")
    
    echo "$distributions" | jq -c '.[]' | while IFS= read -r distribution; do
        local dist_id=$(echo "$distribution" | jq -r '.Id')
        local comment=$(echo "$distribution" | jq -r '.Comment // ""')
        local enabled=$(echo "$distribution" | jq -r '.Enabled')
        
        # Check if distribution is related to our app
        if echo "$comment" | grep -iq "$APP_NAME" || echo "$distribution" | jq -e --arg app "$APP_NAME" '.Origins.Items[].DomainName | contains($app)' &> /dev/null; then
            
            if [ -n "$ENVIRONMENT" ]; then
                # If environment is specified, only consider distributions NOT matching that environment
                if echo "$comment" | grep -iq "$ENVIRONMENT"; then
                    continue
                fi
            fi
            
            # Check if S3 origin exists
            local s3_origins=$(echo "$distribution" | jq -r '.Origins.Items[] | select(.DomainName | endswith(".s3.amazonaws.com") or contains(".s3.")) | .DomainName')
            local is_orphaned=false
            
            while IFS= read -r s3_origin; do
                if [ -n "$s3_origin" ]; then
                    local bucket_name=$(echo "$s3_origin" | sed 's/\.s3\..*amazonaws\.com$//' | sed 's/\.s3\..*$//')
                    if ! aws s3api head-bucket --bucket "$bucket_name" &>/dev/null; then
                        is_orphaned=true
                        break
                    fi
                fi
            done <<< "$s3_origins"
            
            if [ "$is_orphaned" = true ]; then
                update_report "cloudfront_distributions" "found" "$distribution"
                log_warn "Found orphaned CloudFront distribution: $dist_id (Comment: $comment)"
                
                if is_terraform_managed "cloudfront_distribution" "$dist_id"; then
                    log_info "Skipping $dist_id - managed by Terraform"
                else
                    process_cloudfront_deletion "$dist_id" "$distribution"
                fi
            fi
        fi
    done
}

# Process CloudFront distribution deletion
process_cloudfront_deletion() {
    local dist_id="$1"
    local distribution="$2"
    
    if confirm_deletion "CloudFront distribution" "$dist_id"; then
        backup_resource "cloudfront_distribution" "$distribution"
        
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] Would delete CloudFront distribution: $dist_id"
        else
            # First disable the distribution
            log_info "Disabling CloudFront distribution: $dist_id"
            local etag=$(aws cloudfront get-distribution --id "$dist_id" --query 'ETag' --output text)
            local config=$(aws cloudfront get-distribution-config --id "$dist_id" --query 'DistributionConfig' --output json)
            
            # Update config to disable
            echo "$config" | jq '.Enabled = false' > "/tmp/dist-config-$dist_id.json"
            
            if aws cloudfront update-distribution --id "$dist_id" --if-match "$etag" --distribution-config "file:///tmp/dist-config-$dist_id.json" &>/dev/null; then
                log_info "Distribution $dist_id disabled. Waiting for deployment..."
                
                # Wait for distribution to be deployed before deletion
                aws cloudfront wait distribution-deployed --id "$dist_id"
                
                # Get new ETag and delete
                local new_etag=$(aws cloudfront get-distribution --id "$dist_id" --query 'ETag' --output text)
                if aws cloudfront delete-distribution --id "$dist_id" --if-match "$new_etag" 2>/dev/null; then
                    log_success "Successfully deleted CloudFront distribution: $dist_id"
                    update_report "cloudfront_distributions" "deleted" "$distribution"
                else
                    log_error "Failed to delete CloudFront distribution: $dist_id"
                    update_report "cloudfront_distributions" "error" "$distribution"
                fi
            else
                log_error "Failed to disable CloudFront distribution: $dist_id"
                update_report "cloudfront_distributions" "error" "$distribution"
            fi
            
            rm -f "/tmp/dist-config-$dist_id.json"
        fi
    fi
}

# Find unused Route53 records
find_unused_route53_records() {
    show_progress "Scanning for unused Route53 records..."
    
    local hosted_zones=$(aws route53 list-hosted-zones --query 'HostedZones[*].[Id,Name]' --output json)
    
    echo "$hosted_zones" | jq -c '.[]' | while IFS= read -r zone_info; do
        local zone_id=$(echo "$zone_info" | jq -r '.[0]' | sed 's|.*/||')
        local zone_name=$(echo "$zone_info" | jq -r '.[1]')
        
        # Only process zones related to our app
        if echo "$zone_name" | grep -iq "$APP_NAME"; then
            local records=$(aws route53 list-resource-record-sets --hosted-zone-id "$zone_id" --query 'ResourceRecordSets[*]' --output json)
            
            echo "$records" | jq -c '.[]' | while IFS= read -r record; do
                local record_name=$(echo "$record" | jq -r '.Name')
                local record_type=$(echo "$record" | jq -r '.Type')
                
                # Skip essential records
                if [[ "$record_type" = "NS" || "$record_type" = "SOA" ]]; then
                    continue
                fi
                
                if [ -n "$ENVIRONMENT" ]; then
                    # If environment is specified, only consider records NOT matching that environment
                    if echo "$record_name" | grep -iq "$ENVIRONMENT"; then
                        continue
                    fi
                fi
                
                # Check if this record points to non-existent resources
                local is_unused=false
                if [ "$record_type" = "A" ] && echo "$record" | jq -e '.AliasTarget' &> /dev/null; then
                    local alias_target=$(echo "$record" | jq -r '.AliasTarget.DNSName')
                    
                    # Check if it's pointing to a CloudFront distribution that doesn't exist
                    if echo "$alias_target" | grep -q "cloudfront.net"; then
                        # Remove trailing dot from alias_target if present
                        local clean_alias_target="${alias_target%%.}"
                        local dist_info
                        dist_info=$(aws cloudfront list-distributions --query "DistributionList.Items[?DomainName==\`$clean_alias_target\`].{Id:Id,Status:Status}" --output json 2>/dev/null)
                        
                        if [ $? -ne 0 ] || [ -z "$dist_info" ] || [ "$dist_info" = "[]" ] || [ "$dist_info" = "null" ]; then
                            is_unused=true
                            log_verbose "Route53 record points to non-existent CloudFront distribution: $clean_alias_target"
                        else
                            # Validate JSON and check if distribution is deployed
                            if echo "$dist_info" | jq empty 2>/dev/null; then
                                local dist_count
                                dist_count=$(echo "$dist_info" | jq 'length' 2>/dev/null || echo "0")
                                if [ "$dist_count" -gt 0 ]; then
                                    log_verbose "Route53 record points to valid CloudFront distribution: $clean_alias_target"
                                else
                                    is_unused=true
                                    log_verbose "No active CloudFront distributions found for: $clean_alias_target"
                                fi
                            else
                                log_warn "Invalid JSON response when checking CloudFront distribution for $clean_alias_target"
                            fi
                        fi
                    fi
                fi
                
                if [ "$is_unused" = true ]; then
                    update_report "route53_records" "found" "$record"
                    log_warn "Found unused Route53 record: $record_name ($record_type) in zone $zone_name"
                    
                    if is_terraform_managed "route53_record" "$zone_id/$record_name"; then
                        log_info "Skipping $record_name - managed by Terraform"
                    else
                        process_route53_record_deletion "$zone_id" "$record" "$record_name" "$record_type"
                    fi
                fi
            done
        fi
    done
}

# Process Route53 record deletion
process_route53_record_deletion() {
    local zone_id="$1"
    local record="$2"
    local record_name="$3"
    local record_type="$4"
    
    if confirm_deletion "Route53 record" "$record_name ($record_type)"; then
        backup_resource "route53_record" "$record"
        
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] Would delete Route53 record: $record_name ($record_type)"
        else
            local change_batch=$(jq -n --argjson record "$record" '{
                "Changes": [{
                    "Action": "DELETE",
                    "ResourceRecordSet": $record
                }]
            }')
            
            echo "$change_batch" > "/tmp/route53-change-$zone_id.json"
            
            if aws route53 change-resource-record-sets --hosted-zone-id "$zone_id" --change-batch "file:///tmp/route53-change-$zone_id.json" &>/dev/null; then
                log_success "Successfully deleted Route53 record: $record_name ($record_type)"
                update_report "route53_records" "deleted" "$record"
            else
                log_error "Failed to delete Route53 record: $record_name ($record_type)"
                update_report "route53_records" "error" "$record"
            fi
            
            rm -f "/tmp/route53-change-$zone_id.json"
        fi
    fi
}

# Find duplicate ACM certificates
find_duplicate_acm_certificates() {
    show_progress "Scanning for duplicate ACM certificates..."
    
    # Get certificates with error handling
    local certificates
    certificates=$(aws acm list-certificates --region "$AWS_REGION" --query 'CertificateSummaryList[*]' --output json 2>/dev/null)
    if [ $? -ne 0 ] || [ -z "$certificates" ] || [ "$certificates" = "null" ]; then
        log_warn "Failed to list ACM certificates or no certificates found"
        return
    fi
    
    # Validate JSON response
    if ! echo "$certificates" | jq empty 2>/dev/null; then
        log_warn "Invalid JSON response from aws acm list-certificates"
        return
    fi
    
    # Create temporary files to store certificate groups
    local temp_dir=$(mktemp -d)
    trap "rm -rf '$temp_dir'" EXIT
    
    # Process each certificate
    local found_certificates=()
    while IFS= read -r cert; do
        if [ -n "$cert" ] && [ "$cert" != "null" ]; then
            # Validate individual certificate JSON
            if ! echo "$cert" | jq empty 2>/dev/null; then
                log_warn "Skipping malformed certificate JSON"
                continue
            fi
            
            local domain_name
            domain_name=$(echo "$cert" | jq -r '.DomainName // ""' 2>/dev/null)
            if [ -n "$domain_name" ] && echo "$domain_name" | grep -iq "$APP_NAME"; then
                # Store certificate in temp file named by domain pattern
                local pattern
                pattern=$(echo "$domain_name" | sed -E 's/(staging\.|production\.|dev\.|test\.)//g')
                echo "$cert" >> "$temp_dir/$pattern.json"
                found_certificates+=("$domain_name")
            fi
        fi
    done <<< "$(echo "$certificates" | jq -c '.[] // empty' 2>/dev/null)"
    
    if [ ${#found_certificates[@]} -eq 0 ]; then
        log_info "No ACM certificates found for $APP_NAME"
        return
    fi
    
    log_info "Found ${#found_certificates[@]} certificates for $APP_NAME"
    
    # Process each domain pattern group
    for pattern_file in "$temp_dir"/*.json; do
        if [ ! -f "$pattern_file" ]; then
            continue
        fi
        
        local pattern
        pattern=$(basename "$pattern_file" .json)
        
        # Count certificates in this group
        local cert_count
        cert_count=$(wc -l < "$pattern_file")
        
        if [ "$cert_count" -le 1 ]; then
            log_verbose "Domain pattern $pattern has only one certificate, skipping"
            continue
        fi
        
        log_info "Found $cert_count duplicate certificates for pattern: $pattern"
        
        # Find the newest certificate in this group
        local newest_cert=""
        local newest_date=""
        local newest_arn=""
        
        while IFS= read -r cert; do
            if [ -n "$cert" ] && [ "$cert" != "null" ]; then
                local cert_arn
                cert_arn=$(echo "$cert" | jq -r '.CertificateArn // ""' 2>/dev/null)
                if [ -z "$cert_arn" ] || [ "$cert_arn" = "null" ]; then
                    continue
                fi
                
                # Get certificate details with error handling
                local cert_details
                cert_details=$(aws acm describe-certificate --certificate-arn "$cert_arn" --region "$AWS_REGION" --output json 2>/dev/null)
                if [ $? -ne 0 ] || [ -z "$cert_details" ] || [ "$cert_details" = "null" ]; then
                    log_warn "Failed to get details for certificate: $cert_arn"
                    continue
                fi
                
                # Validate certificate details JSON
                if ! echo "$cert_details" | jq empty 2>/dev/null; then
                    log_warn "Invalid JSON response for certificate details: $cert_arn"
                    continue
                fi
                
                local created_at
                created_at=$(echo "$cert_details" | jq -r '.Certificate.CreatedAt // ""' 2>/dev/null)
                
                if [ -n "$created_at" ] && [ "$created_at" != "null" ]; then
                    if [ -z "$newest_date" ] || [[ "$created_at" > "$newest_date" ]]; then
                        newest_date="$created_at"
                        newest_cert="$cert"
                        newest_arn="$cert_arn"
                    fi
                fi
            fi
        done < "$pattern_file"
        
        if [ -z "$newest_cert" ]; then
            log_warn "Could not determine newest certificate for pattern: $pattern"
            continue
        fi
        
        log_info "Keeping newest certificate: $newest_arn (created: $newest_date)"
        
        # Mark all others as duplicates
        while IFS= read -r cert; do
            if [ -n "$cert" ] && [ "$cert" != "null" ] && [ "$cert" != "$newest_cert" ]; then
                local cert_arn
                cert_arn=$(echo "$cert" | jq -r '.CertificateArn // ""' 2>/dev/null)
                local domain_name
                domain_name=$(echo "$cert" | jq -r '.DomainName // ""' 2>/dev/null)
                
                if [ -z "$cert_arn" ] || [ "$cert_arn" = "null" ] || [ -z "$domain_name" ] || [ "$domain_name" = "null" ]; then
                    continue
                fi
                
                # Skip if environment filter is specified and certificate matches that environment
                if [ -n "$ENVIRONMENT" ]; then
                    if echo "$domain_name" | grep -iq "$ENVIRONMENT"; then
                        log_info "Skipping certificate for $ENVIRONMENT environment: $cert_arn"
                        continue
                    fi
                fi
                
                update_report "acm_certificates" "found" "$cert"
                log_warn "Found duplicate ACM certificate: $cert_arn ($domain_name)"
                
                if is_terraform_managed "acm_certificate" "$cert_arn"; then
                    log_info "Skipping $cert_arn - managed by Terraform"
                else
                    process_acm_certificate_deletion "$cert_arn" "$cert" "$domain_name"
                fi
            fi
        done < "$pattern_file"
    done
}

# Process ACM certificate deletion
process_acm_certificate_deletion() {
    local cert_arn="$1"
    local certificate="$2"
    local domain_name="$3"
    
    # Validate inputs
    if [ -z "$cert_arn" ] || [ "$cert_arn" = "null" ] || [ -z "$certificate" ] || [ "$certificate" = "null" ]; then
        log_warn "Invalid certificate data provided for deletion"
        return
    fi
    
    # Check if certificate is in use with error handling
    local in_use
    in_use=$(aws acm describe-certificate --certificate-arn "$cert_arn" --region "$AWS_REGION" --query 'Certificate.InUseBy' --output json 2>/dev/null)
    if [ $? -ne 0 ] || [ -z "$in_use" ]; then
        log_warn "Failed to check if certificate $cert_arn is in use, skipping deletion for safety"
        return
    fi
    
    # Validate JSON response
    if ! echo "$in_use" | jq empty 2>/dev/null; then
        log_warn "Invalid JSON response for certificate usage check: $cert_arn"
        return
    fi
    
    local usage_count
    usage_count=$(echo "$in_use" | jq 'length' 2>/dev/null || echo "1")
    
    if [ "$usage_count" -gt 0 ]; then
        log_warn "Certificate $cert_arn is in use by $usage_count resources, skipping deletion"
        local resources
        resources=$(echo "$in_use" | jq -r '.[]' 2>/dev/null | tr '\n' ' ' || echo "unknown")
        log_info "  In use by: $resources"
        return
    fi
    
    if confirm_deletion "ACM certificate" "$cert_arn ($domain_name)"; then
        backup_resource "acm_certificate" "$certificate"
        
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] Would delete ACM certificate: $cert_arn ($domain_name)"
        else
            log_info "Deleting ACM certificate: $cert_arn ($domain_name)"
            if aws acm delete-certificate --certificate-arn "$cert_arn" --region "$AWS_REGION" 2>/dev/null; then
                log_success "Successfully deleted ACM certificate: $cert_arn ($domain_name)"
                update_report "acm_certificates" "deleted" "$certificate"
            else
                local error_msg
                error_msg=$(aws acm delete-certificate --certificate-arn "$cert_arn" --region "$AWS_REGION" 2>&1 || echo "Unknown error")
                log_error "Failed to delete ACM certificate: $cert_arn ($domain_name)"
                log_error "Error: $error_msg"
                update_report "acm_certificates" "error" "$certificate"
            fi
        fi
    fi
}

# Generate final cleanup report
generate_final_report() {
    show_progress "Generating cleanup report..."
    
    local report_summary=$(jq -r '
        "=== Frontend Cleanup Report ===\n" +
        "Date: " + .cleanup_date + "\n" +
        "Mode: " + (if .dry_run then "DRY RUN" else "REAL CLEANUP" end) + "\n" +
        "Environment: " + (.environment // "ALL") + "\n\n" +
        "SUMMARY:\n" +
        "- S3 Buckets: " + (.summary.s3_buckets_found | tostring) + " found, " + (.summary.s3_buckets_deleted | tostring) + " deleted\n" +
        "- CloudFront Distributions: " + (.summary.cloudfront_distributions_found | tostring) + " found, " + (.summary.cloudfront_distributions_deleted | tostring) + " deleted\n" +
        "- Route53 Records: " + (.summary.route53_records_found | tostring) + " found, " + (.summary.route53_records_deleted | tostring) + " deleted\n" +
        "- ACM Certificates: " + (.summary.acm_certificates_found | tostring) + " found, " + (.summary.acm_certificates_deleted | tostring) + " deleted\n" +
        "- Errors: " + (.errors | length | tostring) + "\n\n" +
        "Detailed report saved to: " + "'$CLEANUP_REPORT'" + "\n" +
        (if .dry_run == false then "Backup files saved to: " + "'$BACKUP_DIR'" + "\n" else "" end) +
        "Log file: " + "'$LOG_FILE'"
    ' "$CLEANUP_REPORT")
    
    echo -e "\n${GREEN}$report_summary${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --real-run)
            DRY_RUN=false
            shift
            ;;
        --force)
            FORCE=true
            INTERACTIVE=false
            shift
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate environment if specified
if [ -n "$ENVIRONMENT" ] && [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    log_error "Invalid environment. Must be 'staging' or 'production'"
    exit 1
fi

# Main execution
main() {
    log_info "Starting frontend duplicate resources cleanup..."
    log_info "Mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "REAL CLEANUP")"
    log_info "Environment: ${ENVIRONMENT:-ALL}"
    log_info "Region: $AWS_REGION"
    log_info "Interactive: $INTERACTIVE"
    
    # Initialize
    check_aws_cli
    init_cleanup_report
    
    # Run cleanup operations
    find_duplicate_s3_buckets
    find_orphaned_cloudfront_distributions
    find_unused_route53_records
    find_duplicate_acm_certificates
    
    # Generate final report
    generate_final_report
    
    log_success "Cleanup operation completed!"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "\n${YELLOW}This was a dry run. Use --real-run to execute actual deletions.${NC}"
    fi
}

# Run main function
main "$@"