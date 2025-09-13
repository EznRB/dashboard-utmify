'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Share2,
  Link,
  Mail,
  Copy,
  Eye,
  EyeOff,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Shield,
  Settings,
  X,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Download,
  QrCode,
  Globe,
  Lock,
  UserPlus,
  Trash2,
  Edit3,
  Send
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Types
interface SharePermission {
  id: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  addedAt: Date;
  lastAccess?: Date;
}

interface ShareSettings {
  isPublic: boolean;
  requiresAuth: boolean;
  allowDownload: boolean;
  allowComments: boolean;
  expiresAt?: Date;
  password?: string;
  permissions: SharePermission[];
  publicLink?: string;
  embedCode?: string;
}

interface ShareModalProps {
  reportId: string;
  reportTitle: string;
  shareSettings: ShareSettings;
  onUpdateSettings: (settings: ShareSettings) => Promise<void>;
  onGenerateLink: () => Promise<string>;
  onRevokeLink: () => Promise<void>;
  onSendEmail: (emails: string[], message: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

// Role configurations
const roles = [
  {
    value: 'viewer',
    label: 'Visualizador',
    description: 'Pode apenas visualizar o relatório',
    permissions: ['view']
  },
  {
    value: 'editor',
    label: 'Editor',
    description: 'Pode visualizar e editar filtros',
    permissions: ['view', 'edit_filters']
  },
  {
    value: 'admin',
    label: 'Administrador',
    description: 'Controle total sobre o relatório',
    permissions: ['view', 'edit_filters', 'share', 'delete']
  }
];

export const ShareModal: React.FC<ShareModalProps> = ({
  reportId,
  reportTitle,
  shareSettings,
  onUpdateSettings,
  onGenerateLink,
  onRevokeLink,
  onSendEmail,
  onClose,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'email' | 'permissions' | 'settings'>('link');
  const [localSettings, setLocalSettings] = useState<ShareSettings>(shareSettings);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [emailMessage, setEmailMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(localSettings.expiresAt);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    setLocalSettings(shareSettings);
  }, [shareSettings]);

  const handleSettingsChange = (updates: Partial<ShareSettings>) => {
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
  };

  const saveSettings = async () => {
    try {
      await onUpdateSettings(localSettings);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const generatePublicLink = async () => {
    try {
      const link = await onGenerateLink();
      handleSettingsChange({ publicLink: link, isPublic: true });
      await saveSettings();
    } catch (error) {
      console.error('Failed to generate link:', error);
    }
  };

  const revokePublicLink = async () => {
    try {
      await onRevokeLink();
      handleSettingsChange({ publicLink: undefined, isPublic: false });
      await saveSettings();
    } catch (error) {
      console.error('Failed to revoke link:', error);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const addUserPermission = () => {
    if (newUserEmail.trim() && newUserEmail.includes('@')) {
      const newPermission: SharePermission = {
        id: `perm_${Date.now()}`,
        email: newUserEmail.trim(),
        role: newUserRole,
        addedAt: new Date()
      };
      
      const updatedPermissions = [...localSettings.permissions, newPermission];
      handleSettingsChange({ permissions: updatedPermissions });
      setNewUserEmail('');
      setNewUserRole('viewer');
    }
  };

  const removeUserPermission = (permissionId: string) => {
    const updatedPermissions = localSettings.permissions.filter(p => p.id !== permissionId);
    handleSettingsChange({ permissions: updatedPermissions });
  };

  const updateUserRole = (permissionId: string, newRole: 'viewer' | 'editor' | 'admin') => {
    const updatedPermissions = localSettings.permissions.map(p => 
      p.id === permissionId ? { ...p, role: newRole } : p
    );
    handleSettingsChange({ permissions: updatedPermissions });
  };

  const addEmailRecipient = (email: string) => {
    if (email.trim() && email.includes('@') && !emailRecipients.includes(email.trim())) {
      setEmailRecipients([...emailRecipients, email.trim()]);
    }
  };

  const removeEmailRecipient = (email: string) => {
    setEmailRecipients(emailRecipients.filter(e => e !== email));
  };

  const sendEmailInvites = async () => {
    if (emailRecipients.length > 0) {
      try {
        await onSendEmail(emailRecipients, emailMessage);
        setEmailRecipients([]);
        setEmailMessage('');
      } catch (error) {
        console.error('Failed to send emails:', error);
      }
    }
  };

  const generateEmbedCode = () => {
    if (localSettings.publicLink) {
      const embedCode = `<iframe src="${localSettings.publicLink}?embed=true" width="100%" height="600" frameborder="0"></iframe>`;
      handleSettingsChange({ embedCode });
      return embedCode;
    }
    return '';
  };

  const getExpiryOptions = () => [
    { label: 'Nunca', value: null },
    { label: '1 dia', value: addDays(new Date(), 1) },
    { label: '1 semana', value: addWeeks(new Date(), 1) },
    { label: '1 mês', value: addMonths(new Date(), 1) },
    { label: '3 meses', value: addMonths(new Date(), 3) },
    { label: 'Personalizado', value: 'custom' }
  ];

  const renderLinkTab = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium text-sm mb-1">Link Público</h3>
            <p className="text-xs text-gray-600">Qualquer pessoa com o link pode acessar</p>
          </div>
          <Switch
            checked={localSettings.isPublic}
            onCheckedChange={(checked) => {
              if (checked && !localSettings.publicLink) {
                generatePublicLink();
              } else if (!checked) {
                handleSettingsChange({ isPublic: false });
              } else {
                handleSettingsChange({ isPublic: checked });
              }
            }}
          />
        </div>

        {localSettings.isPublic && localSettings.publicLink && (
          <div className="space-y-3">
            <div className="flex space-x-2">
              <Input
                value={localSettings.publicLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(localSettings.publicLink!)}
                className="shrink-0"
              >
                {copySuccess ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(localSettings.publicLink, '_blank')}
                className="shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQRCode(!showQRCode)}
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(generateEmbedCode())}
              >
                <Copy className="w-4 h-4 mr-2" />
                Código Embed
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={revokePublicLink}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Revogar
              </Button>
            </div>

            {showQRCode && (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="w-32 h-32 bg-white border-2 border-gray-300 mx-auto mb-2 flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-gray-400" />
                </div>
                <p className="text-xs text-gray-600">QR Code para acesso rápido</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="font-medium text-sm mb-3">Configurações de Acesso</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Requer Autenticação</Label>
              <p className="text-xs text-gray-600">Usuários devem fazer login para acessar</p>
            </div>
            <Switch
              checked={localSettings.requiresAuth}
              onCheckedChange={(checked) => handleSettingsChange({ requiresAuth: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Permitir Download</Label>
              <p className="text-xs text-gray-600">Usuários podem baixar o relatório</p>
            </div>
            <Switch
              checked={localSettings.allowDownload}
              onCheckedChange={(checked) => handleSettingsChange({ allowDownload: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Permitir Comentários</Label>
              <p className="text-xs text-gray-600">Usuários podem adicionar comentários</p>
            </div>
            <Switch
              checked={localSettings.allowComments}
              onCheckedChange={(checked) => handleSettingsChange({ allowComments: checked })}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-medium mb-3 block">Senha de Proteção (Opcional)</Label>
        <div className="flex space-x-2">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={localSettings.password || ''}
            onChange={(e) => handleSettingsChange({ password: e.target.value })}
            placeholder="Digite uma senha"
          />
          <Button
            variant="outline"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-3 block">Data de Expiração</Label>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {getExpiryOptions().slice(0, 4).map((option, index) => (
              <Button
                key={index}
                variant={expiryDate === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setExpiryDate(option.value as Date);
                  handleSettingsChange({ expiresAt: option.value as Date });
                }}
                className="text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>
          
          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expiryDate ? (
                  format(expiryDate, "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  <span>Selecione uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={expiryDate}
                onSelect={(date) => {
                  setExpiryDate(date);
                  handleSettingsChange({ expiresAt: date });
                  setShowCalendar(false);
                }}
                disabled={(date) => date < new Date()}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );

  const renderEmailTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-sm mb-3">Enviar por Email</h3>
        <p className="text-xs text-gray-600 mb-4">
          Envie o link do relatório diretamente para pessoas específicas
        </p>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Destinatários</Label>
            <div className="flex space-x-2 mb-2">
              <Input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Digite o email do destinatário"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addEmailRecipient(newUserEmail);
                    setNewUserEmail('');
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  addEmailRecipient(newUserEmail);
                  setNewUserEmail('');
                }}
                disabled={!newUserEmail.trim() || !newUserEmail.includes('@')}
              >
                Adicionar
              </Button>
            </div>
            
            {emailRecipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {emailRecipients.map((email, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                    <span>{email}</span>
                    <button
                      onClick={() => removeEmailRecipient(email)}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Mensagem Personalizada</Label>
            <Textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder={`Olá! Compartilho com você o relatório "${reportTitle}". Clique no link abaixo para acessar:\n\n{link}\n\nAtenciosamente,`}
              rows={4}
            />
          </div>

          <Button
            onClick={sendEmailInvites}
            disabled={emailRecipients.length === 0 || isLoading}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar Convites ({emailRecipients.length})
          </Button>
        </div>
      </div>
    </div>
  );

  const renderPermissionsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-sm mb-3">Gerenciar Permissões</h3>
        <p className="text-xs text-gray-600 mb-4">
          Controle quem pode acessar e o que podem fazer com este relatório
        </p>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="Email do usuário"
              className="flex-1"
            />
            <Select value={newUserRole} onValueChange={(value: any) => setNewUserRole(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={addUserPermission}
              disabled={!newUserEmail.trim() || !newUserEmail.includes('@')}
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {localSettings.permissions.map((permission) => {
              const role = roles.find(r => r.value === permission.role);
              return (
                <div key={permission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{permission.email}</span>
                      <Badge variant={permission.role === 'admin' ? 'default' : 'secondary'}>
                        {role?.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Adicionado em {format(permission.addedAt, 'dd/MM/yyyy', { locale: ptBR })}
                      {permission.lastAccess && (
                        <> • Último acesso: {format(permission.lastAccess, 'dd/MM/yyyy', { locale: ptBR })}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={permission.role}
                      onValueChange={(value: any) => updateUserRole(permission.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUserPermission(permission.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {localSettings.permissions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum usuário com permissões específicas</p>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-medium text-sm mb-3">Níveis de Permissão</h4>
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.value} className="p-3 border rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Badge variant={role.value === 'admin' ? 'default' : 'secondary'}>
                  {role.label}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 mb-2">{role.description}</p>
              <div className="flex flex-wrap gap-1">
                {role.permissions.map((perm, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {perm === 'view' && 'Visualizar'}
                    {perm === 'edit_filters' && 'Editar Filtros'}
                    {perm === 'share' && 'Compartilhar'}
                    {perm === 'delete' && 'Excluir'}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-sm mb-3">Configurações Avançadas</h3>
        
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Acesso Público</Label>
                  <p className="text-xs text-gray-600">Permite acesso sem autenticação</p>
                </div>
                <div className="flex items-center space-x-2">
                  {localSettings.isPublic ? (
                    <Globe className="w-4 h-4 text-green-600" />
                  ) : (
                    <Lock className="w-4 h-4 text-gray-400" />
                  )}
                  <Switch
                    checked={localSettings.isPublic}
                    onCheckedChange={(checked) => handleSettingsChange({ isPublic: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Proteção por Senha</Label>
                  <p className="text-xs text-gray-600">Adiciona uma camada extra de segurança</p>
                </div>
                <div className="flex items-center space-x-2">
                  {localSettings.password ? (
                    <Shield className="w-4 h-4 text-green-600" />
                  ) : (
                    <Shield className="w-4 h-4 text-gray-400" />
                  )}
                  <Switch
                    checked={!!localSettings.password}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        handleSettingsChange({ password: undefined });
                      }
                    }}
                  />
                </div>
              </div>
              {localSettings.password && (
                <div className="mt-3">
                  <Input
                    type="password"
                    value={localSettings.password}
                    onChange={(e) => handleSettingsChange({ password: e.target.value })}
                    placeholder="Digite a senha"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Data de Expiração</Label>
                  <p className="text-xs text-gray-600">
                    {localSettings.expiresAt 
                      ? `Expira em ${format(localSettings.expiresAt, 'dd/MM/yyyy', { locale: ptBR })}`
                      : 'Nunca expira'
                    }
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {localSettings.expiresAt ? (
                    <Clock className="w-4 h-4 text-orange-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-medium text-sm mb-3">Estatísticas de Acesso</h4>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-xs text-gray-600">Visualizações</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{localSettings.permissions.length}</div>
              <div className="text-xs text-gray-600">Usuários com Acesso</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Share2 className="w-5 h-5" />
              <span>Compartilhar Relatório</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
          <p className="text-sm text-gray-600">{reportTitle}</p>
        </CardHeader>
        
        <CardContent>
          <div className="flex border-b mb-6">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'link'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('link')}
            >
              Link Público
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'email'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('email')}
            >
              Enviar Email
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'permissions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('permissions')}
            >
              Permissões
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('settings')}
            >
              Configurações
            </button>
          </div>

          <ScrollArea className="h-96">
            {activeTab === 'link' && renderLinkTab()}
            {activeTab === 'email' && renderEmailTab()}
            {activeTab === 'permissions' && renderPermissionsTab()}
            {activeTab === 'settings' && renderSettingsTab()}
          </ScrollArea>

          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <div className="text-sm text-gray-600">
              {localSettings.isPublic && (
                <Badge variant="secondary" className="mr-2">
                  <Globe className="w-3 h-3 mr-1" />
                  Público
                </Badge>
              )}
              {localSettings.password && (
                <Badge variant="secondary" className="mr-2">
                  <Lock className="w-3 h-3 mr-1" />
                  Protegido
                </Badge>
              )}
              {localSettings.expiresAt && (
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  Expira
                </Badge>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={saveSettings} disabled={isLoading}>
                Salvar Configurações
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareModal;