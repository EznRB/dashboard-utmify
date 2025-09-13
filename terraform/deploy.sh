#!/bin/bash

# Utmify Infrastructure Deploy Script
# This script helps deploy infrastructure using Terraform for different environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=""
ACTION=""
AUTO_APPROVE=false
VERBOSE=false
DRY_RUN=false

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Environment to deploy (dev, staging, production)"
    echo "  -a, --action ACTION      Action to perform (plan, apply, destroy, output)"
    echo "  -y, --auto-approve       Auto approve terraform apply/destroy"
    echo "  -v, --verbose            Enable verbose output"
    echo "  -d, --dry-run            Show what would be done without executing"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e dev -a plan                    # Plan deployment for dev environment"
    echo "  $0 -e staging -a apply -y             # Apply staging with auto-approve"
    echo "  $0 -e production -a destroy           # Destroy production (with confirmation)"
    echo "  $0 -e dev -a output                   # Show outputs for dev environment"
}

# Function to validate environment
validate_environment() {
    case $ENVIRONMENT in
        dev|staging|production)
            print_info "Environment: $ENVIRONMENT"
            ;;
        *)
            print_error "Invalid environment: $ENVIRONMENT"
            print_error "Valid environments: dev, staging, production"
            exit 1
            ;;
    esac
}

# Function to validate action
validate_action() {
    case $ACTION in
        plan|apply|destroy|output|init|validate|fmt)
            print_info "Action: $ACTION"
            ;;
        *)
            print_error "Invalid action: $ACTION"
            print_error "Valid actions: plan, apply, destroy, output, init, validate, fmt"
            exit 1
            ;;
    esac
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed or not in PATH"
        exit 1
    fi
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed or not in PATH"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured or invalid"
        print_error "Run 'aws configure' to set up your credentials"
        exit 1
    fi
    
    # Check if environment file exists
    if [[ ! -f "environments/${ENVIRONMENT}.tfvars" ]]; then
        print_error "Environment file not found: environments/${ENVIRONMENT}.tfvars"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to initialize terraform
init_terraform() {
    print_info "Initializing Terraform..."
    
    if [[ $VERBOSE == true ]]; then
        terraform init
    else
        terraform init > /dev/null
    fi
    
    print_success "Terraform initialized"
}

# Function to validate terraform configuration
validate_terraform() {
    print_info "Validating Terraform configuration..."
    
    terraform validate
    
    print_success "Terraform configuration is valid"
}

# Function to format terraform files
format_terraform() {
    print_info "Formatting Terraform files..."
    
    terraform fmt -recursive
    
    print_success "Terraform files formatted"
}

# Function to plan deployment
plan_deployment() {
    print_info "Planning deployment for $ENVIRONMENT environment..."
    
    local plan_file="${ENVIRONMENT}.tfplan"
    
    if [[ $VERBOSE == true ]]; then
        terraform plan -var-file="environments/${ENVIRONMENT}.tfvars" -out="$plan_file"
    else
        terraform plan -var-file="environments/${ENVIRONMENT}.tfvars" -out="$plan_file" -no-color
    fi
    
    print_success "Plan completed. Plan file saved as: $plan_file"
    print_info "Review the plan above before applying"
}

# Function to apply deployment
apply_deployment() {
    print_info "Applying deployment for $ENVIRONMENT environment..."
    
    local plan_file="${ENVIRONMENT}.tfplan"
    
    # Check if plan file exists
    if [[ ! -f "$plan_file" ]]; then
        print_warning "Plan file not found. Creating new plan..."
        plan_deployment
    fi
    
    # Confirmation for production
    if [[ $ENVIRONMENT == "production" && $AUTO_APPROVE == false ]]; then
        print_warning "You are about to apply changes to PRODUCTION environment!"
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [[ $confirm != "yes" ]]; then
            print_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Apply the plan
    if [[ $AUTO_APPROVE == true ]]; then
        terraform apply -auto-approve "$plan_file"
    else
        terraform apply "$plan_file"
    fi
    
    print_success "Deployment completed successfully!"
    
    # Show outputs
    print_info "Deployment outputs:"
    terraform output
}

# Function to destroy infrastructure
destroy_infrastructure() {
    print_warning "You are about to DESTROY infrastructure for $ENVIRONMENT environment!"
    print_warning "This action cannot be undone!"
    
    if [[ $AUTO_APPROVE == false ]]; then
        read -p "Type 'destroy' to confirm: " confirm
        if [[ $confirm != "destroy" ]]; then
            print_info "Destruction cancelled"
            exit 0
        fi
    fi
    
    print_info "Destroying infrastructure..."
    
    if [[ $AUTO_APPROVE == true ]]; then
        terraform destroy -var-file="environments/${ENVIRONMENT}.tfvars" -auto-approve
    else
        terraform destroy -var-file="environments/${ENVIRONMENT}.tfvars"
    fi
    
    print_success "Infrastructure destroyed"
}

# Function to show outputs
show_outputs() {
    print_info "Showing outputs for $ENVIRONMENT environment..."
    
    terraform output
}

# Function to backup state
backup_state() {
    print_info "Creating state backup..."
    
    local backup_dir="backups"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="${backup_dir}/terraform_${ENVIRONMENT}_${timestamp}.tfstate"
    
    mkdir -p "$backup_dir"
    
    if [[ -f "terraform.tfstate" ]]; then
        cp "terraform.tfstate" "$backup_file"
        print_success "State backup created: $backup_file"
    else
        print_warning "No local state file found to backup"
    fi
}

# Function to show infrastructure status
show_status() {
    print_info "Infrastructure status for $ENVIRONMENT:"
    
    echo ""
    echo "=== Terraform State ==="
    terraform show -no-color | head -20
    
    echo ""
    echo "=== AWS Resources ==="
    aws sts get-caller-identity
    
    echo ""
    echo "=== Recent Deployments ==="
    if [[ -d "backups" ]]; then
        ls -la backups/ | grep "$ENVIRONMENT" | tail -5
    else
        echo "No backup history found"
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -a|--action)
            ACTION="$2"
            shift 2
            ;;
        -y|--auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z $ENVIRONMENT ]]; then
    print_error "Environment is required"
    show_usage
    exit 1
fi

if [[ -z $ACTION ]]; then
    print_error "Action is required"
    show_usage
    exit 1
fi

# Main execution
print_info "Starting Terraform deployment script"
print_info "Environment: $ENVIRONMENT"
print_info "Action: $ACTION"

if [[ $DRY_RUN == true ]]; then
    print_warning "DRY RUN MODE - No changes will be made"
    exit 0
fi

# Validate inputs
validate_environment
validate_action

# Check prerequisites
check_prerequisites

# Create backup before destructive operations
if [[ $ACTION == "apply" || $ACTION == "destroy" ]]; then
    backup_state
fi

# Execute the requested action
case $ACTION in
    init)
        init_terraform
        ;;
    validate)
        validate_terraform
        ;;
    fmt)
        format_terraform
        ;;
    plan)
        init_terraform
        validate_terraform
        plan_deployment
        ;;
    apply)
        init_terraform
        validate_terraform
        apply_deployment
        ;;
    destroy)
        init_terraform
        destroy_infrastructure
        ;;
    output)
        show_outputs
        ;;
    status)
        show_status
        ;;
esac

print_success "Script completed successfully!"