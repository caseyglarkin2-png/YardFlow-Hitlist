#!/bin/bash
pwd > /workspaces/YardFlow-Hitlist/pwd.txt
ls -la /workspaces/YardFlow-Hitlist/eventops/.next > /workspaces/YardFlow-Hitlist/build_check.txt 2>&1
curl -v http://localhost:3002/api/health > /workspaces/YardFlow-Hitlist/health_check.txt 2>&1
