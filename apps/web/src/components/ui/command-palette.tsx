"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search, Calculator, Calendar, CreditCard, Settings, User, FileText, BarChart3, Target, Zap } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface CommandPaletteProps extends DialogProps {
  onOpenChange?: (open: boolean) => void
}

interface CommandAction {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  shortcut?: string
  action: () => void
  group?: string
}

const useCommandPalette = () => {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return
        }

        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  const commands: CommandAction[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: BarChart3,
      shortcut: "⌘D",
      action: () => router.push("/dashboard"),
      group: "Navigation"
    },
    {
      id: "campaigns",
      label: "Campanhas",
      icon: Target,
      shortcut: "⌘C",
      action: () => router.push("/campaigns"),
      group: "Navigation"
    },
    {
      id: "integrations",
      label: "Integrações",
      icon: Zap,
      shortcut: "⌘I",
      action: () => router.push("/integrations"),
      group: "Navigation"
    },
    {
      id: "reports",
      label: "Relatórios",
      icon: FileText,
      shortcut: "⌘R",
      action: () => router.push("/reports"),
      group: "Navigation"
    },
    {
      id: "utm",
      label: "UTM Builder",
      icon: Search,
      action: () => router.push("/utm"),
      group: "Tools"
    },
    {
      id: "settings",
      label: "Configurações",
      icon: Settings,
      shortcut: "⌘,",
      action: () => router.push("/settings"),
      group: "Settings"
    },
    {
      id: "billing",
      label: "Assinatura",
      icon: CreditCard,
      action: () => router.push("/billing"),
      group: "Settings"
    },
    {
      id: "team",
      label: "Equipe",
      icon: User,
      action: () => router.push("/team"),
      group: "Settings"
    },
    {
      id: "calendar",
      label: "Calendário",
      icon: Calendar,
      action: () => router.push("/calendar"),
      group: "Tools"
    },
    {
      id: "calculator",
      label: "Calculadora",
      icon: Calculator,
      action: () => window.open("https://calculator.net", "_blank"),
      group: "Tools"
    }
  ]

  const groupedCommands = commands.reduce((acc, command) => {
    const group = command.group || "Other"
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(command)
    return acc
  }, {} as Record<string, CommandAction[]>)

  return {
    open,
    setOpen,
    runCommand,
    groupedCommands
  }
}

export function CommandPalette({ ...props }: CommandPaletteProps) {
  const { open, setOpen, runCommand, groupedCommands } = useCommandPalette()

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-8 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
        )}
        onClick={() => setOpen(true)}
        {...props}
      >
        <Search className="mr-2 h-4 w-4" />
        Buscar...
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Digite um comando ou busque..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          {Object.entries(groupedCommands).map(([group, commands]) => (
            <React.Fragment key={group}>
              <CommandGroup heading={group}>
                {commands.map((command) => {
                  const Icon = command.icon
                  return (
                    <CommandItem
                      key={command.id}
                      value={command.label}
                      onSelect={() => {
                        runCommand(command.action)
                      }}
                    >
                      {Icon && <Icon className="mr-2 h-4 w-4" />}
                      <span>{command.label}</span>
                      {command.shortcut && (
                        <CommandShortcut>{command.shortcut}</CommandShortcut>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              <CommandSeparator />
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}

export { useCommandPalette }