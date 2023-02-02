import { Observable } from 'rxjs';
import { Timestamp } from "google/protobuf/google.protobuf";
import { common } from "./commons";

enum Person__PhoneType {
  MOBILE,
  HOME,
  WORK,
}
export interface Person__PhoneNumber {
  number: string;
  type: Person__PhoneType;
}
export interface Person {
  name: string;
  id: number;
  email: string;
  password: string;
  phones: Person__PhoneNumber[];
  last_updated: Timestamp;
}
export interface AddressBook__AddressBook1__AddressBook2__AddressBook3__PhoneNumber {
}
export interface AddressBook__AddressBook1__AddressBook2__AddressBook3 {
}
export interface AddressBook__AddressBook1__AddressBook2 {
}
export interface AddressBook__AddressBook1 {
}
export interface AddressBook {
  people: Person[];
  address: AddressBook__AddressBook1__AddressBook2__AddressBook3;
}
export interface UpdateCallLogsRequest__UpateFlags {
  add: string;
  delete: string;
  set: string;
}
export interface UpdateCallLogsRequest {
  call_link_id: string;
  flags: UpdateCallLogsRequest__UpateFlags;
}
export interface tutorialService {
  getData(data:AddressBook):Observable<common>;
  setdata(data:AddressBook):Observable<common>;
}
