"use client";

import { Dropdown } from "flowbite-react";

export default function Usermenu() {
  return (
    <Dropdown label="R">
      <Dropdown.Item>Dashboard</Dropdown.Item>
      <Dropdown.Item>Settings</Dropdown.Item>
      <Dropdown.Item>Earnings</Dropdown.Item>
      <Dropdown.Item>Sign out</Dropdown.Item>
    </Dropdown>
  );
}