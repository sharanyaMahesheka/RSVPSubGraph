import { Address, ipfs, json } from "@graphprotocol/graph-ts";
import { Account, RSVP, Confirmation, Event } from "../generated/schema";
import { integer } from "@protofire/subgraph-toolkit";
import { BigInt } from "@graphprotocol/graph-ts"
import {
  Web3RSVP,
  ConfirmedAttendee,
  DepositsPaid,
  NewEventCreated,
  NewRSVP
} from "../generated/Web3RSVP/Web3RSVP"

export function handleConfirmedAttendee(event: ConfirmedAttendee): void {
  let id = event.params.eventId.toHex()+ event.params.attendee.toHex();
  let newConfirmation = Confirmation.load(id);
  let account = getOtCreateAccount(event.params.attendee);
  let thisEvent = Event.load(event.params.eventId.toHex());

  if(newConfirmation == null && thisEvent != null){
    newConfirmation = new Confirmation(id);
    newConfirmation.attendee = account.id;
    newConfirmation.event = thisEvent.id;
    thisEvent.totalConfirmedAttendees = integer.increment(thisEvent.totalConfirmedAttendees);
    account.totalAttendedEvents = integer.increment(account.totalAttendedEvents);
    thisEvent.save();
    newConfirmation.save();
    account.save();
  }
}

export function handleDepositsPaid(event: DepositsPaid): void {
  let thisEvent = Event.load(event.params.eventId.toHex());
  if(thisEvent) {
    thisEvent.paidOut = true;
    thisEvent.save();
  }
}

export function handleNewEventCreated(event: NewEventCreated): void {
  let newEvent = Event.load(event.params.eventId.toHex());
  if(newEvent == null) {
    newEvent = new Event(event.params.eventId.toHex());
    newEvent.eventId = event.params.eventId;
    newEvent.eventOwner = event.params.eventOwner;
    newEvent.deposit = event.params.deposit;
    newEvent.maxCapacity = event.params.maxCapacity;
    newEvent.paidOut = false;
    newEvent.eventTimestamp = event.params.eventTimestamp;
    newEvent.totalRSVPs = integer.ZERO;
    newEvent.totalConfirmedAttendees = integer.ZERO;

    let metadata = ipfs.cat(event.params.eventDataCID + "/data.json");

    if(metadata) {
      const value = json.fromBytes(metadata).toObject();
      const name = value.get("name");
      const description = value.get("description");
      const imagePath = value.get("image");
      const link = value.get("link");

      if(name) {
        newEvent.name = name.toString();
      }

      if(description) {
        newEvent.description = description.toString();
      }

      if(link) {
        newEvent.link = link.toString();
      }

      if(imagePath) {
        const imageUrl = "https://ipfs.io/ipfs" + event.params.eventDataCID + imagePath.toString();
        newEvent.imageURL = imageUrl;
      } else {
        newEvent.imageURL = "https://ipfs.io/ipfs/bafybeibssbrlptcefbqfh4vpw2wlmqfj2kgxt3nil4yujxbmdznau3t5wi/event.png";
      }
    }
    newEvent.save();
  }
}

export function handleNewRSVP(event: NewRSVP): void {
  let id = event.params.eventId.toHex()+ event.params.attendee.toHex();
  let newRSVP = RSVP.load(id);
  let account = getOtCreateAccount(event.params.attendee);
  let thisEvent = Event.load(event.params.eventId.toHex());

  if(newRSVP == null && thisEvent != null){
    newRSVP = new RSVP(id);
    newRSVP.attendee = account.id;
    newRSVP.event = thisEvent.id;
    thisEvent.totalRSVPs = integer.increment(thisEvent.totalRSVPs);
    account.totalRSVPs = integer.increment(account.totalRSVPs);
    thisEvent.save();
    newRSVP.save();
    account.save();
  }

}

export function getOtCreateAccount( address: Address) : Account {
  let account = Account.load(address.toHex());
  if(account == null) {
    account = new Account(address.toHex());
    account.totalRSVPs = integer.ZERO;
    account.totalAttendedEvents = integer.ZERO;
    account.save();
  }
  return account;
}
