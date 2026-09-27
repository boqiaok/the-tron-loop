/** Why an editor kept a draft off the public site. */
export enum RejectionReason {
  /** Not right for a family and community guide. */
  NotSuitable = 'not_suitable',
  /** Another listing already covers it. */
  Duplicate = 'duplicate',
  /** Nobody can go, such as a sold-out event or a service. */
  NotAvailable = 'not_available',
}
