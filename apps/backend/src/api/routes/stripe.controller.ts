import {Controller, Post, RawBodyRequest, Req} from "@nestjs/common";
import {StripeService} from "@gitroom/nestjs-libraries/services/stripe.service";
import {ApiTags} from "@nestjs/swagger";

@ApiTags('Stripe')
@Controller('/stripe')
export class StripeController {
  constructor(
    private readonly _stripeService: StripeService
  ) {
  }
  @Post('/')
  stripe(
    @Req() req: RawBodyRequest<Request>
  ) {
    const event = this._stripeService.validateRequest(
      req.rawBody,
      req.headers['stripe-signature'],
      process.env.STRIPE_SIGNING_KEY
    );

    // Maybe it comes from another stripe webhook
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (event?.data?.object?.metadata?.service !== 'gitroom') {
      return {ok: true};
    }

    switch (event.type) {
      case 'customer.subscription.created':
        return this._stripeService.createSubscription(event);
      case 'customer.subscription.updated':
        return this._stripeService.updateSubscription(event);
      case 'customer.subscription.deleted':
        return this._stripeService.deleteSubscription(event);
      default:
        return {ok: true};
    }
  }
}
