package main

import (
	"flag"
	"fmt"
	"github.com/tolabs/database/pkg/webhook"
	"log"
	"os"

	"github.com/tolabs/database/pkg/server"
	dbserver "github.com/tolabs/database/server"
)

func main() {
	log.SetOutput(os.Stdout)
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	flag.Parse()

	cf := flag.Arg(0)
	if cf == "" {
		fmt.Println("The config file is not specified")
		return
	}

	config, err := server.InitConfig(cf)
	if err != nil {
		fmt.Println(err)
		return
	}

	rs := dbserver.DatabaseServer{
		ConfigFile: cf,
	}

	//webhook钩子
	go webhook.WebhookFunc(config)

	rs.Serve(config)
}
