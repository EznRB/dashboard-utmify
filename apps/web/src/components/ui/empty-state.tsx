"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { 
  Search, 
  FileText, 
  Users, 
  BarChart3, 
  Settings, 
  CreditCard, 
  Link, 
  Target,
  Database,
  AlertCircle,
  Plus,
  RefreshCw,
  Inbox,
  LucideIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  }
  className?: string
  size?: "sm" | "md" | "lg"
  animated?: boolean
}

const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "md",
  animated = true,
}: EmptyStateProps) => {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  }

  const iconVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
    hover: {
      scale: 1.05,
      transition: { duration: 0.2 },
    },
  }

  const sizeClasses = {
    sm: {
      container: "py-8",
      icon: "h-12 w-12",
      title: "text-lg",
      description: "text-sm",
    },
    md: {
      container: "py-12",
      icon: "h-16 w-16",
      title: "text-xl",
      description: "text-base",
    },
    lg: {
      container: "py-16",
      icon: "h-20 w-20",
      title: "text-2xl",
      description: "text-lg",
    },
  }

  const currentSize = sizeClasses[size]

  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center text-center space-y-4",
      currentSize.container,
      className
    )}>
      <motion.div
        variants={iconVariants}
        initial={animated ? "hidden" : false}
        animate={animated ? "visible" : false}
        whileHover={animated ? "hover" : undefined}
        className="flex items-center justify-center rounded-full bg-muted p-4"
      >
        <Icon className={cn(currentSize.icon, "text-muted-foreground")} />
      </motion.div>

      <motion.div
        variants={itemVariants}
        initial={animated ? "hidden" : false}
        animate={animated ? "visible" : false}
        className="space-y-2 max-w-md"
      >
        <h3 className={cn("font-semibold tracking-tight", currentSize.title)}>
          {title}
        </h3>
        {description && (
          <p className={cn("text-muted-foreground", currentSize.description)}>
            {description}
          </p>
        )}
      </motion.div>

      {(action || secondaryAction) && (
        <motion.div
          variants={itemVariants}
          initial={animated ? "hidden" : false}
          animate={animated ? "visible" : false}
          className="flex flex-col sm:flex-row gap-2 pt-2"
        >
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || "default"}
              className="min-w-[120px]"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || "outline"}
              className="min-w-[120px]"
            >
              {secondaryAction.label}
            </Button>
          )}
        </motion.div>
      )}
    </div>
  )

  if (animated) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {content}
      </motion.div>
    )
  }

  return content
}

// Predefined Empty States for common scenarios

// No Search Results
export const NoSearchResults = ({
  searchTerm,
  onClear,
  className,
}: {
  searchTerm?: string
  onClear?: () => void
  className?: string
}) => (
  <EmptyState
    icon={Search}
    title="Nenhum resultado encontrado"
    description={
      searchTerm
        ? `Não encontramos resultados para "${searchTerm}". Tente ajustar sua busca.`
        : "Tente ajustar os filtros ou termos de busca."
    }
    action={
      onClear
        ? {
            label: "Limpar busca",
            onClick: onClear,
            variant: "outline" as const,
          }
        : undefined
    }
    className={className}
  />
)

// No Data
export const NoData = ({
  title = "Nenhum dado disponível",
  description = "Não há dados para exibir no momento.",
  onRefresh,
  className,
}: {
  title?: string
  description?: string
  onRefresh?: () => void
  className?: string
}) => (
  <EmptyState
    icon={Database}
    title={title}
    description={description}
    action={
      onRefresh
        ? {
            label: "Atualizar",
            onClick: onRefresh,
            variant: "outline" as const,
          }
        : undefined
    }
    className={className}
  />
)

// No Campaigns
export const NoCampaigns = ({
  onCreate,
  className,
}: {
  onCreate?: () => void
  className?: string
}) => (
  <EmptyState
    icon={Target}
    title="Nenhuma campanha criada"
    description="Comece criando sua primeira campanha para rastrear seus links e analisar o desempenho."
    action={
      onCreate
        ? {
            label: "Criar campanha",
            onClick: onCreate,
          }
        : undefined
    }
    className={className}
  />
)

// No Reports
export const NoReports = ({
  onGenerate,
  className,
}: {
  onGenerate?: () => void
  className?: string
}) => (
  <EmptyState
    icon={BarChart3}
    title="Nenhum relatório disponível"
    description="Gere relatórios para analisar o desempenho das suas campanhas e obter insights valiosos."
    action={
      onGenerate
        ? {
            label: "Gerar relatório",
            onClick: onGenerate,
          }
        : undefined
    }
    className={className}
  />
)

// No Integrations
export const NoIntegrations = ({
  onConnect,
  className,
}: {
  onConnect?: () => void
  className?: string
}) => (
  <EmptyState
    icon={Link}
    title="Nenhuma integração conectada"
    description="Conecte suas plataformas favoritas para automatizar o rastreamento e sincronizar dados."
    action={
      onConnect
        ? {
            label: "Conectar plataforma",
            onClick: onConnect,
          }
        : undefined
    }
    className={className}
  />
)

// No Team Members
export const NoTeamMembers = ({
  onInvite,
  className,
}: {
  onInvite?: () => void
  className?: string
}) => (
  <EmptyState
    icon={Users}
    title="Nenhum membro na equipe"
    description="Convide membros para colaborar no seu workspace e trabalhar juntos nos projetos."
    action={
      onInvite
        ? {
            label: "Convidar membro",
            onClick: onInvite,
          }
        : undefined
    }
    className={className}
  />
)

// Error State
export const ErrorState = ({
  title = "Algo deu errado",
  description = "Ocorreu um erro inesperado. Tente novamente em alguns instantes.",
  onRetry,
  onSupport,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  onSupport?: () => void
  className?: string
}) => (
  <EmptyState
    icon={AlertCircle}
    title={title}
    description={description}
    action={
      onRetry
        ? {
            label: "Tentar novamente",
            onClick: onRetry,
          }
        : undefined
    }
    secondaryAction={
      onSupport
        ? {
            label: "Contatar suporte",
            onClick: onSupport,
            variant: "outline" as const,
          }
        : undefined
    }
    className={className}
  />
)

// Loading State (with empty state styling)
export const LoadingState = ({
  title = "Carregando...",
  description = "Aguarde enquanto carregamos os dados.",
  className,
}: {
  title?: string
  description?: string
  className?: string
}) => (
  <EmptyState
    icon={RefreshCw}
    title={title}
    description={description}
    className={className}
    animated={false}
  />
)

// Coming Soon State
export const ComingSoon = ({
  title = "Em breve",
  description = "Esta funcionalidade estará disponível em breve. Fique atento às atualizações!",
  onNotify,
  className,
}: {
  title?: string
  description?: string
  onNotify?: () => void
  className?: string
}) => (
  <EmptyState
    icon={Settings}
    title={title}
    description={description}
    action={
      onNotify
        ? {
            label: "Notificar quando disponível",
            onClick: onNotify,
            variant: "outline" as const,
          }
        : undefined
    }
    className={className}
  />
)

// Empty State in Card
export const EmptyStateCard = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <Card className={cn("border-dashed border-2", className)}>
    {children}
  </Card>
)

export { EmptyState }
export type { EmptyStateProps }