'use client';

import React, { useState } from 'react';
import { TrackingPixel, useConversionTracking } from './tracking-pixel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TrackingExampleProps {
  utmLinkId?: string;
  shortCode?: string;
}

export function TrackingExample({ utmLinkId, shortCode }: TrackingExampleProps) {
  const { trackConversion } = useConversionTracking();
  const [isTracking, setIsTracking] = useState(false);
  const [conversionData, setConversionData] = useState({
    eventName: 'purchase',
    value: 99.99,
    currency: 'USD',
    customerId: '',
    customerEmail: '',
  });

  const handleTrackConversion = async () => {
    if (!utmLinkId && !shortCode) {
      alert('UTM Link ID ou Short Code é necessário para tracking');
      return;
    }

    setIsTracking(true);
    try {
      await trackConversion({
        utmId: utmLinkId,
        conversionType: 'custom',
        conversionValue: conversionData.value,
        currency: conversionData.currency,
        customEventName: conversionData.eventName,
        metadata: {
          source: 'tracking-example',
          timestamp: new Date().toISOString(),
          customerId: conversionData.customerId || undefined,
          customerEmail: conversionData.customerEmail || undefined,
          shortCode,
        },
      });
      alert('Conversão rastreada com sucesso!');
    } catch (error) {
      console.error('Erro ao rastrear conversão:', error);
      alert('Erro ao rastrear conversão');
    } finally {
      setIsTracking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pixel de tracking automático */}
      <TrackingPixel
        utmId={utmLinkId}
        conversionType="custom"
        customEventName="example_page_view"
      />

      <Card>
        <CardHeader>
          <CardTitle>Exemplo de Tracking de Conversão</CardTitle>
          <CardDescription>
            Demonstração de como usar o sistema de tracking UTM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventName">Nome do Evento</Label>
              <Input
                id="eventName"
                value={conversionData.eventName}
                onChange={(e) =>
                  setConversionData({ ...conversionData, eventName: e.target.value })
                }
                placeholder="Ex: purchase, signup, download"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Valor</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={conversionData.value}
                onChange={(e) =>
                  setConversionData({ ...conversionData, value: parseFloat(e.target.value) })
                }
                placeholder="99.99"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <Input
                id="currency"
                value={conversionData.currency}
                onChange={(e) =>
                  setConversionData({ ...conversionData, currency: e.target.value })
                }
                placeholder="USD, BRL, EUR"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerId">ID do Cliente (opcional)</Label>
              <Input
                id="customerId"
                value={conversionData.customerId}
                onChange={(e) =>
                  setConversionData({ ...conversionData, customerId: e.target.value })
                }
                placeholder="customer_123"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email do Cliente (opcional)</Label>
            <Input
              id="customerEmail"
              type="email"
              value={conversionData.customerEmail}
              onChange={(e) =>
                setConversionData({ ...conversionData, customerEmail: e.target.value })
              }
              placeholder="cliente@exemplo.com"
            />
          </div>

          <Button
            onClick={handleTrackConversion}
            disabled={isTracking}
            className="w-full"
          >
            {isTracking ? 'Rastreando...' : 'Rastrear Conversão'}
          </Button>

          <div className="text-sm text-muted-foreground">
            <p><strong>UTM Link ID:</strong> {utmLinkId || 'Não fornecido'}</p>
            <p><strong>Short Code:</strong> {shortCode || 'Não fornecido'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TrackingExample;