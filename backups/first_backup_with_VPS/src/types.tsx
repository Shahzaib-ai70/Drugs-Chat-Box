import React from 'react';

export interface ServiceItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export interface AddedService {
  id: string;
  service: ServiceItem;
  customName: string;
}
