"use client"

import * as React from "react"
import { toast as sonnerToast, Toaster as SonnerToaster } from "sonner"
import { motion } from "framer-motion"
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  X,
  Loader2,
  LucideIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Toast types
type ToastType = "success" | "error" | "warning" | "info" | "loading" | "default"

interface ToastOptions {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
  dismissible?: boolean
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"
}

interface CustomToastProps {
  id: string | number
  title?: string
  description?: string
  type: ToastType
  action?: {
    label: string
    onClick: () => void
  }
  onDismiss?: () => void
  dismissible?: boolean
}

// Toast icons mapping
const toastIcons: Record<ToastType, LucideIcon> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  loading: Loader2,
  default: Info,
}

// Toast colors mapping
const toastColors: Record<ToastType, string> = {
  success: "text-green-600 dark:text-green-400",
  error: "text-red-600 dark:text-red-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  info: "text-blue-600 dark:text-blue-400",
  loading: "text-blue-600 dark:text-blue-400",
  default: "text-gray-600 dark:text-gray-400",
}

// Custom Toast Component
const CustomToast = ({
  id,
  title,
  description,
  type,
  action,
  onDismiss,
  dismissible = true,
}: CustomToastProps) => {
  const Icon = toastIcons[type]
  const iconColor = toastColors[type]

  const toastVariants = {
    initial: {
      opacity: 0,
      y: -50,
      scale: 0.95,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
  }

  return (
    <motion.div
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all",
        "bg-background text-foreground",
        "hover:shadow-xl"
      )}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Icon 
            className={cn(
              "h-5 w-5",
              iconColor,
              type === "loading" && "animate-spin"
            )} 
          />
        </div>
        <div className="flex-1 space-y-1">
          {title && (
            <div className="text-sm font-semibold leading-none tracking-tight">
              {title}
            </div>
          )}
          {description && (
            <div className="text-sm text-muted-foreground">
              {description}
            </div>
          )}
          {action && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={action.onClick}
                className="h-8 px-3 text-xs"
              >
                {action.label}
              </Button>
            </div>
          )}
        </div>
      </div>
      {dismissible && onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "absolute right-2 top-2 h-6 w-6 rounded-md p-0 opacity-0 transition-opacity",
            "group-hover:opacity-100",
            "hover:bg-muted"
          )}
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </Button>
      )}
    </motion.div>
  )
}

// Enhanced toast functions
const toast = {
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.custom(
      (t) => (
        <CustomToast
          id={t}
          title={options?.title || "Sucesso"}
          description={message}
          type="success"
          action={options?.action}
          onDismiss={() => sonnerToast.dismiss(t)}
          dismissible={options?.dismissible}
        />
      ),
      {
        duration: options?.duration || 4000,
        position: options?.position || "top-right",
      }
    )
  },

  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.custom(
      (t) => (
        <CustomToast
          id={t}
          title={options?.title || "Erro"}
          description={message}
          type="error"
          action={options?.action}
          onDismiss={() => sonnerToast.dismiss(t)}
          dismissible={options?.dismissible}
        />
      ),
      {
        duration: options?.duration || 6000,
        position: options?.position || "top-right",
      }
    )
  },

  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.custom(
      (t) => (
        <CustomToast
          id={t}
          title={options?.title || "Atenção"}
          description={message}
          type="warning"
          action={options?.action}
          onDismiss={() => sonnerToast.dismiss(t)}
          dismissible={options?.dismissible}
        />
      ),
      {
        duration: options?.duration || 5000,
        position: options?.position || "top-right",
      }
    )
  },

  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.custom(
      (t) => (
        <CustomToast
          id={t}
          title={options?.title || "Informação"}
          description={message}
          type="info"
          action={options?.action}
          onDismiss={() => sonnerToast.dismiss(t)}
          dismissible={options?.dismissible}
        />
      ),
      {
        duration: options?.duration || 4000,
        position: options?.position || "top-right",
      }
    )
  },

  loading: (message: string, options?: ToastOptions) => {
    return sonnerToast.custom(
      (t) => (
        <CustomToast
          id={t}
          title={options?.title || "Carregando..."}
          description={message}
          type="loading"
          action={options?.action}
          onDismiss={() => sonnerToast.dismiss(t)}
          dismissible={options?.dismissible ?? false}
        />
      ),
      {
        duration: options?.duration || Infinity,
        position: options?.position || "top-right",
      }
    )
  },

  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
      ...options
    }: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    } & ToastOptions
  ) => {
    return sonnerToast.promise(promise, {
      loading: loading,
      success: (data) => {
        const message = typeof success === "function" ? success(data) : success
        return message
      },
      error: (err) => {
        const message = typeof error === "function" ? error(err) : error
        return message
      },
      duration: options?.duration,
      position: options?.position || "top-right",
    })
  },

  custom: (jsx: (id: string | number) => React.ReactElement, options?: ToastOptions) => {
    return sonnerToast.custom(jsx, {
      duration: options?.duration || 4000,
      position: options?.position || "top-right",
    })
  },

  dismiss: (id?: string | number) => {
    return sonnerToast.dismiss(id)
  },

  // Utility methods
  dismissAll: () => sonnerToast.dismiss(),
}

// Toaster component with custom styling
const Toaster = () => {
  return (
    <SonnerToaster
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      position="top-right"
      expand={true}
      richColors={false}
      closeButton={false}
    />
  )
}

// Hook for using toast
const useToast = () => {
  return {
    toast,
    dismiss: toast.dismiss,
    dismissAll: toast.dismissAll,
  }
}

// Predefined toast messages for common scenarios
const toastMessages = {
  // Success messages
  saved: () => toast.success("Alterações salvas com sucesso!"),
  created: (item: string) => toast.success(`${item} criado com sucesso!`),
  updated: (item: string) => toast.success(`${item} atualizado com sucesso!`),
  deleted: (item: string) => toast.success(`${item} excluído com sucesso!`),
  copied: () => toast.success("Copiado para a área de transferência!"),
  
  // Error messages
  error: (message?: string) => toast.error(message || "Ocorreu um erro inesperado"),
  networkError: () => toast.error("Erro de conexão. Verifique sua internet."),
  unauthorized: () => toast.error("Você não tem permissão para esta ação"),
  notFound: (item: string) => toast.error(`${item} não encontrado`),
  
  // Warning messages
  unsavedChanges: () => toast.warning("Você tem alterações não salvas"),
  limitReached: (limit: string) => toast.warning(`Limite de ${limit} atingido`),
  
  // Info messages
  processing: () => toast.info("Processando sua solicitação..."),
  emailSent: () => toast.info("E-mail enviado com sucesso!"),
  
  // Loading messages
  saving: () => toast.loading("Salvando alterações..."),
  loading: (action: string) => toast.loading(`${action}...`),
}

export {
  toast,
  useToast,
  toastMessages,
  Toaster,
  CustomToast,
}

export type {
  ToastType,
  ToastOptions,
  CustomToastProps,
}