'use client'

import React, { useState, useEffect } from 'react'
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  MoreHorizontal, 
  Trash2, 
  Edit, 
  Crown,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTenant, useTenantPermissions } from '@/contexts/tenant-context'
import { TenantUser, TenantInvitation, InviteUserData } from '@/types/tenant'
import { toast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface UserManagementProps {
  className?: string
}

export function UserManagement({ className }: UserManagementProps) {
  const { tenant } = useTenant()
  const { canManageUsers } = useTenantPermissions()
  const [users, setUsers] = useState<TenantUser[]>([])
  const [invitations, setInvitations] = useState<TenantInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  useEffect(() => {
    if (tenant) {
      loadUsers()
      loadInvitations()
    }
  }, [tenant])

  const loadUsers = async () => {
    try {
      const response = await fetch(`/api/tenants/${tenant?.id}/users`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadInvitations = async () => {
    try {
      const response = await fetch(`/api/tenants/${tenant?.id}/invitations`)
      if (response.ok) {
        const data = await response.json()
        setInvitations(data)
      }
    } catch (error) {
      console.error('Erro ao carregar convites:', error)
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'destructive'
      case 'ADMIN':
        return 'default'
      case 'MANAGER':
        return 'secondary'
      case 'VIEWER':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default'
      case 'SUSPENDED':
        return 'destructive'
      case 'PENDING':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getInvitationStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'ACCEPTED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'EXPIRED':
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  if (!canManageUsers) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Você não tem permissão para gerenciar usuários.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciar Usuários</h2>
          <p className="text-muted-foreground">
            Gerencie os membros da sua organização e seus níveis de acesso
          </p>
        </div>
        <InviteUserDialog 
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          onInviteSent={() => {
            loadInvitations()
            setInviteDialogOpen(false)
          }}
        />
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Usuários ({users.length})</span>
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Convites ({invitations.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Ativos</CardTitle>
              <CardDescription>
                Lista de todos os usuários com acesso à organização
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {user.userId.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.userId}</p>
                            <p className="text-sm text-muted-foreground">
                              Membro desde {formatDistanceToNow(new Date(user.joinedAt), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role === 'OWNER' && <Crown className="h-3 w-3 mr-1" />}
                            {user.role}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.lastActiveAt ? (
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(user.lastActiveAt), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Nunca</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role !== 'OWNER' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar função
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Shield className="mr-2 h-4 w-4" />
                                Gerenciar permissões
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remover usuário
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardHeader>
              <CardTitle>Convites Pendentes</CardTitle>
              <CardDescription>
                Lista de convites enviados para novos usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{invitation.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(invitation.role)}>
                          {invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getInvitationStatusIcon(invitation.status)}
                          <span className="text-sm">{invitation.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(invitation.createdAt), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(invitation.expiresAt), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Reenviar convite
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Cancelar convite
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface InviteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInviteSent: () => void
}

function InviteUserDialog({ open, onOpenChange, onInviteSent }: InviteUserDialogProps) {
  const { tenant } = useTenant()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'VIEWER'>('VIEWER')
  const [isLoading, setIsLoading] = useState(false)

  const handleInvite = async () => {
    if (!email || !tenant) return

    try {
      setIsLoading(true)
      
      const inviteData: InviteUserData = {
        email,
        role
      }

      const response = await fetch(`/api/tenants/${tenant.id}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteData)
      })

      if (!response.ok) {
        throw new Error('Erro ao enviar convite')
      }

      toast({
        title: 'Convite enviado',
        description: `Convite enviado para ${email} com sucesso`,
      })

      setEmail('')
      setRole('VIEWER')
      onInviteSent()
    } catch (error) {
      console.error('Erro ao enviar convite:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o convite',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Convidar Usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar Novo Usuário</DialogTitle>
          <DialogDescription>
            Envie um convite para que uma pessoa se junte à sua organização
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIEWER">Visualizador - Apenas visualizar dados</SelectItem>
                <SelectItem value="MANAGER">Gerente - Gerenciar campanhas e relatórios</SelectItem>
                <SelectItem value="ADMIN">Administrador - Acesso completo exceto configurações</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleInvite} disabled={!email || isLoading}>
            {isLoading ? 'Enviando...' : 'Enviar Convite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { InviteUserDialog }