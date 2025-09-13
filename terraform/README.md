# Utmify Infrastructure - Terraform Configuration

Este diretório contém a configuração Terraform para provisionar a infraestrutura AWS do Utmify.

## 📋 Pré-requisitos

- [Terraform](https://www.terraform.io/downloads.html) >= 1.0
- [AWS CLI](https://aws.amazon.com/cli/) configurado
- Credenciais AWS com permissões adequadas
- Bucket S3 para armazenar o estado do Terraform (backend)

## 🏗️ Arquitetura

A infraestrutura inclui:

- **VPC** com subnets públicas, privadas e de banco de dados
- **ECS Fargate** para executar containers da API e Web
- **Application Load Balancer** com SSL/TLS
- **RDS PostgreSQL** com Multi-AZ (produção)
- **ElastiCache Redis** para cache
- **CloudFront** para CDN
- **Route53** para DNS (opcional)
- **Auto Scaling** baseado em CPU/memória
- **CloudWatch** para monitoramento e logs
- **Secrets Manager** para gerenciar segredos
- **KMS** para criptografia

## 📁 Estrutura de Arquivos

```
terraform/
├── main.tf              # Configuração principal
├── variables.tf         # Definição de variáveis
├── outputs.tf           # Outputs da infraestrutura
├── ecs.tf              # Configuração ECS
├── database.tf         # RDS e Redis
├── autoscaling.tf      # Auto scaling
├── terraform.tfvars.example  # Exemplo de variáveis
└── environments/       # Configurações por ambiente
    ├── dev.tfvars
    ├── staging.tfvars
    └── production.tfvars
```

## 🚀 Como Usar

### 1. Configuração Inicial

```bash
# Clone o repositório e navegue para o diretório terraform
cd terraform

# Copie o arquivo de exemplo e configure suas variáveis
cp terraform.tfvars.example terraform.tfvars

# Edite o arquivo terraform.tfvars com suas configurações
```

### 2. Configurar Backend S3

Edite o arquivo `main.tf` e configure o backend S3:

```hcl
terraform {
  backend "s3" {
    bucket = "seu-bucket-terraform-state"
    key    = "utmify/terraform.tfstate"
    region = "us-east-1"
  }
}
```

### 3. Inicializar Terraform

```bash
# Inicializar o Terraform
terraform init

# Validar a configuração
terraform validate

# Formatar os arquivos
terraform fmt
```

### 4. Deploy por Ambiente

#### Desenvolvimento
```bash
# Planejar o deploy
terraform plan -var-file="environments/dev.tfvars"

# Aplicar as mudanças
terraform apply -var-file="environments/dev.tfvars"
```

#### Staging
```bash
terraform plan -var-file="environments/staging.tfvars"
terraform apply -var-file="environments/staging.tfvars"
```

#### Produção
```bash
terraform plan -var-file="environments/production.tfvars"
terraform apply -var-file="environments/production.tfvars"
```

## ⚙️ Configuração de Variáveis

### Variáveis Obrigatórias

```hcl
# Configuração geral
environment = "dev"        # dev, staging, production
aws_region  = "us-east-1"
project_name = "utmify"

# Configuração de rede
vpc_cidr = "10.0.0.0/16"
public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]

# Configuração ECS
api_cpu = 512
api_memory = 1024
api_desired_count = 2

# Configuração do banco de dados
db_instance_class = "db.t3.micro"
db_name = "utmify"
db_username = "utmify_user"
```

### Variáveis de Segredos

Defina as seguintes variáveis de ambiente ou use AWS Secrets Manager:

```bash
export TF_VAR_jwt_secret="your-jwt-secret"
export TF_VAR_db_password="your-db-password"
export TF_VAR_encryption_key="your-encryption-key"
```

## 🔐 Segurança

### Secrets Manager

Os seguintes segredos são gerenciados pelo AWS Secrets Manager:

- `utmify/{environment}/database` - Credenciais do banco de dados
- `utmify/{environment}/jwt` - JWT secret
- `utmify/{environment}/encryption` - Chave de criptografia
- `utmify/{environment}/external-apis` - APIs externas (Stripe, etc.)

### Security Groups

- **ALB**: Permite tráfego HTTP/HTTPS da internet
- **ECS**: Permite tráfego do ALB e acesso ao RDS/Redis
- **RDS**: Permite acesso apenas do ECS
- **Redis**: Permite acesso apenas do ECS

## 📊 Monitoramento

### CloudWatch Alarms

- CPU e memória alta nos serviços ECS
- Conexões de banco de dados
- Latência do ALB
- Erros 4xx/5xx

### Logs

- Logs da aplicação: `/aws/ecs/utmify-{service}`
- Logs do ALB: S3 bucket configurado
- VPC Flow Logs (opcional)

## 🔄 Auto Scaling

### Políticas de Scaling

- **Scale Up**: CPU > 70% ou Memória > 80%
- **Scale Down**: CPU < 30% ou Memória < 40%
- **Cooldown**: 300 segundos

### Scheduled Scaling (Produção)

- Scale up durante horário comercial
- Scale down durante madrugada

## 💰 Otimização de Custos

### Desenvolvimento
- Instâncias menores (t3.micro)
- Spot instances habilitadas
- Auto shutdown configurado
- Logs com retenção menor

### Produção
- Reserved instances recomendadas
- Multi-AZ para alta disponibilidade
- Backups automáticos
- Monitoramento completo

## 🔧 Comandos Úteis

```bash
# Ver estado atual
terraform show

# Listar recursos
terraform state list

# Ver outputs
terraform output

# Destruir infraestrutura (cuidado!)
terraform destroy -var-file="environments/dev.tfvars"

# Importar recurso existente
terraform import aws_instance.example i-1234567890abcdef0

# Refresh do estado
terraform refresh
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **Erro de permissões AWS**
   - Verifique se suas credenciais AWS estão configuradas
   - Confirme se tem as permissões necessárias

2. **Erro de backend S3**
   - Verifique se o bucket existe
   - Confirme as permissões no bucket

3. **Recursos já existem**
   - Use `terraform import` para importar recursos existentes
   - Ou renomeie os recursos na configuração

4. **Limites de quota AWS**
   - Verifique os limites da sua conta AWS
   - Solicite aumento de quota se necessário

### Logs de Debug

```bash
# Habilitar logs detalhados
export TF_LOG=DEBUG
terraform apply

# Salvar logs em arquivo
export TF_LOG_PATH=terraform.log
```

## 📚 Recursos Adicionais

- [Documentação Terraform](https://www.terraform.io/docs)
- [AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Teste suas mudanças
4. Faça commit das mudanças
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.