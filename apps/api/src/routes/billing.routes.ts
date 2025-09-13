import { FastifyInstance } from 'fastify';
import { BillingController } from '../controllers/billing.controller';

export async function billingRoutes(fastify: FastifyInstance) {
  const billingController = new BillingController();

  // Public routes (no authentication required)
  fastify.post('/webhook', {
    config: {
      rawBody: true, // Need raw body for Stripe webhook verification
    },
    schema: {
      description: 'Handle Stripe webhook events',
      tags: ['billing'],
      body: {
        type: 'string'
      },
      response: {
        200: {
          type: 'object',
          properties: {
            received: { type: 'boolean' }
          }
        }
      }
    },
    handler: billingController.handleWebhook.bind(billingController),
  });

  fastify.get('/plans', {
    schema: {
      description: 'Get available billing plans',
      tags: ['billing'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' },
                  price: { type: 'number' },
                  currency: { type: 'string' },
                  interval: { type: 'string' },
                  features: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    handler: billingController.getPlans.bind(billingController),
  });

  // Protected routes (authentication required)
  fastify.register(async function (fastify) {
    // Add authentication hook
    fastify.addHook('preHandler', async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    });

    // Billing management routes
    fastify.post('/create-checkout', {
      schema: {
        description: 'Create Stripe checkout session',
        tags: ['billing'],
        body: {
          type: 'object',
          required: ['planId', 'successUrl', 'cancelUrl'],
          properties: {
            planId: { type: 'string' },
            successUrl: { type: 'string', format: 'uri' },
            cancelUrl: { type: 'string', format: 'uri' },
            couponCode: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  sessionId: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
          },
        },
      },
      handler: billingController.createCheckout.bind(billingController),
    });

    fastify.get('/subscription', {
      schema: {
        description: 'Get current subscription details',
        tags: ['billing'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  currentPeriodStart: { type: 'string', format: 'date-time' },
                  currentPeriodEnd: { type: 'string', format: 'date-time' },
                  cancelAtPeriodEnd: { type: 'boolean' },
                  plan: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                      price: { type: 'number' },
                    },
                  },
                  usage: {
                    type: 'object',
                    properties: {
                      integrations: { type: 'number' },
                      users: { type: 'number' },
                      apiCalls: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      handler: billingController.getSubscription.bind(billingController),
    });

    fastify.post('/cancel', {
      schema: {
        description: 'Cancel subscription',
        tags: ['billing'],
        body: {
          type: 'object',
          properties: {
            cancelAtPeriodEnd: { type: 'boolean', default: true },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  cancelAtPeriodEnd: { type: 'boolean' },
                  canceledAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
      handler: billingController.cancelSubscription.bind(billingController),
    });

    fastify.post('/upgrade', {
      schema: {
        description: 'Upgrade/downgrade subscription',
        tags: ['billing'],
        body: {
          type: 'object',
          required: ['planId'],
          properties: {
            planId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  planId: { type: 'string' },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
      },
      handler: billingController.upgradeSubscription.bind(billingController),
    });

    fastify.get('/invoices', {
      schema: {
        description: 'Get billing invoices',
        tags: ['billing'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    number: { type: 'string' },
                    status: { type: 'string' },
                    total: { type: 'number' },
                    currency: { type: 'string' },
                    paidAt: { type: 'string', format: 'date-time' },
                    hostedInvoiceUrl: { type: 'string' },
                    invoicePdf: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      handler: billingController.getInvoices.bind(billingController),
    });

    fastify.post('/payment-method', {
      schema: {
        description: 'Update payment method',
        tags: ['billing'],
        body: {
          type: 'object',
          required: ['paymentMethodId'],
          properties: {
            paymentMethodId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
      handler: billingController.updatePaymentMethod.bind(billingController),
    });

    fastify.get('/usage', {
      schema: {
        description: 'Get usage statistics and limits',
        tags: ['billing'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  exceeded: { type: 'boolean' },
                  limits: {
                    type: 'object',
                    properties: {
                      integrations: { type: 'number' },
                      users: { type: 'number' },
                      apiCalls: { type: 'number' },
                    },
                  },
                  usage: {
                    type: 'object',
                    properties: {
                      integrations: { type: 'number' },
                      users: { type: 'number' },
                      apiCalls: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      handler: billingController.getUsage.bind(billingController),
    });

    fastify.post('/usage', {
      schema: {
        description: 'Record usage for metered billing',
        tags: ['billing'],
        body: {
          type: 'object',
          required: ['metricName', 'quantity'],
          properties: {
            metricName: {
              type: 'string',
              enum: ['integrations', 'users', 'api_calls'],
            },
            quantity: { type: 'number', minimum: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
      handler: billingController.recordUsage.bind(billingController),
    });

    fastify.post('/portal', {
      schema: {
        description: 'Create Stripe customer portal session',
        tags: ['billing'],
        body: {
          type: 'object',
          required: ['returnUrl'],
          properties: {
            returnUrl: { type: 'string', format: 'uri' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                },
              },
            },
          },
        },
      },
      handler: billingController.createPortalSession.bind(billingController),
    });

    // Soft delete management routes
    fastify.post('/subscription/restore', {
      schema: {
        description: 'Restore a soft-deleted subscription',
        tags: ['billing'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  organizationId: { type: 'string' },
                },
              },
            },
          },
        },
      },
      handler: billingController.restoreSubscription.bind(billingController),
    });

    fastify.get('/subscriptions/deleted', {
      schema: {
        description: 'Get soft-deleted subscriptions',
        tags: ['billing'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    status: { type: 'string' },
                    organizationId: { type: 'string' },
                    deletedAt: { type: 'string', format: 'date-time' },
                    plan: { type: 'object' },
                    organization: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
      handler: billingController.getDeletedSubscriptions.bind(billingController),
    });

    fastify.delete('/subscription/permanent', {
      schema: {
        description: 'Permanently delete a soft-deleted subscription (Owner only)',
        tags: ['billing'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
      handler: billingController.permanentlyDeleteSubscription.bind(billingController),
    });
  });
}